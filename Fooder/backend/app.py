from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from Fooder.backend.api import restaurants
from Fooder.backend.api import users
from Fooder.backend.api import foods
from Fooder.backend.api import reviews
from Fooder.backend.database.db import SessionLocal
from Fooder.backend.database.models import User, Restaurant
from Fooder.backend.database.models import Food
from Fooder.backend.scraping.gmaps_scraper import search_and_save
from Fooder.backend.recommendation.recommendation_system_tfidf import (
    UserSession,
    load_food_master_from_db,
    build_tfidf_engine,
    get_top_recommendations,
    get_liked_foods_scores,
    decide_match,
)

import os
from google import genai
from pydantic import BaseModel
from dotenv import load_dotenv

from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(env_path)

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

app = FastAPI(title="FooDer Backend")
from Fooder.backend.database.db import Base, engine
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://web-fooder.vercel.app"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Per-user session store (in-memory, keyed by user_id) ─────────────────────
_user_sessions: dict[int, UserSession] = {}
_food_master = None
_tfidf = None
_tfidf_matrix = None

# ── Chatbot

class ChatRequest(BaseModel):
    message: str
    
FOODER_SYSTEM_PROMPT = """
Kamu adalah FoodBot, asisten kuliner pada aplikasi FooDer.

Tugas kamu:

1. Menjawab pertanyaan tentang makanan.
2. Menjawab pertanyaan tentang restoran.
3. Memberikan rekomendasi makanan.
4. Menjelaskan rasa makanan.
5. Menjelaskan kategori makanan.
6. Membantu penggunaan aplikasi FooDer.

Jika pengguna bertanya di luar topik kuliner atau aplikasi FooDer,
jawab dengan sopan:

"Maaf, saya hanya dapat membantu pertanyaan seputar makanan,
restoran, dan penggunaan aplikasi FooDer."

Jawab singkat, ramah, dan mudah dipahami.
"""

def _get_rec_engine():
    """Lazy-load food_master dan TF-IDF engine dari database."""
    global _food_master, _tfidf, _tfidf_matrix
    if _food_master is None:
        db = SessionLocal()
        try:
            _food_master = load_food_master_from_db(db)
        finally:
            db.close()
        _tfidf, _tfidf_matrix = build_tfidf_engine(_food_master)
    return _food_master, _tfidf, _tfidf_matrix


def _get_user_session(user_id: int) -> UserSession:
    if user_id not in _user_sessions:
        _user_sessions[user_id] = UserSession()
    return _user_sessions[user_id]

from collections import Counter


def check_food_match(
    user_sess,
    food_master,
    tfidf,
    tfidf_matrix,
):
    """
    Match Logic
    1. < 5 likes
       -> tidak boleh match
    2. 5 - 9 likes
       -> match jika final_score >= MIN_SCORE
    3. >= 10 likes
       -> force match dari Top 10
    """
    MIN_LIKES = 6
    MAX_LIKES = 10
    MIN_SCORE = 0.45
    liked_count = len(
        user_sess.liked_foods
    )
    print("\n" + "=" * 50)
    print("CHECK FOOD MATCH")
    print("=" * 50)
    print("LIKED COUNT:", liked_count)
    # --------------------------------------------------
    # BELUM CUKUP LIKE
    # --------------------------------------------------
    if liked_count < MIN_LIKES:
        print(
            f"[MATCH] Need at least "
            f"{MIN_LIKES} likes"
        )
        return None
    recommendations = get_top_recommendations(
        user_sess,
        food_master,
        tfidf,
        tfidf_matrix,
        top_n=10
    )
    if not recommendations:
        print(
            "[MATCH] No recommendations"
        )
        return None
    best_food = recommendations[0]
    # --------------------------------------------------
    # FORCE MATCH — dari liked foods
    # --------------------------------------------------
    if liked_count >= MAX_LIKES:
        print("[MATCH] Force Match (10 Likes Reached)")

        liked_scores = get_liked_foods_scores(
            user_sess, food_master, tfidf, tfidf_matrix
        )

        if not liked_scores:
            print("[MATCH] No liked foods scores found")
            return None

        best_food = max(liked_scores, key=lambda x: x["final_score"])

        print(
            f"[MATCH] Selected: {best_food['food_name']} "
            f"(score={best_food['final_score']:.4f})"
        )

        return {
            "matched": True,
            "food_id": best_food["food_id"],
            "food_name": best_food["food_name"],
            "final_score": round(best_food["final_score"], 4),
        }

    # --------------------------------------------------
    # EARLY MATCH
    # --------------------------------------------------

    if (
        best_food["final_score"]
        >= MIN_SCORE
    ):

        print(
            "[MATCH] Early Match"
        )

        return {
            "matched": True,
            "food_id":
                best_food["food_id"],
            "food_name":
                best_food["food_name"],
            "final_score":
                round(
                    best_food["final_score"],
                    4
                ),
        }

    # --------------------------------------------------
    # BELUM MEMENUHI SCORE
    # --------------------------------------------------

    print(
        "[MATCH] Score below threshold"
    )

    return None

app.include_router(restaurants.router)
app.include_router(users.router)
app.include_router(foods.router)
app.include_router(reviews.router)


import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sentiment"))

try:
    from routes.sentiment import router as sentiment_router
    from routes.review import router as review_router
    app.include_router(sentiment_router)
    app.include_router(review_router)
    print("[OK] Sentiment router berhasil dimuat.")
except Exception as e:
    print(f"[WARN] Sentiment router gagal: {e}")

@app.get("/")
def home():
    return {"message": "FooDer Backend Running"}

swipe_history = []

class SwipeRequest(BaseModel):
    user_id: int
    food_id: int
    action: str  # "like" | "dislike"


class InitPreferenceRequest(BaseModel):
    user_id: int
    preferences: List[str]   # ["spicy", "rice", "indonesian", "halal", ...]

class PreferenceRequest(BaseModel):
    user_id: int
    moods: list[str] = []
    food_types: list[str] = []
    cuisines: list[str] = []
    requirements: list[str] = []
    allergies: list[str] = []

from sqlalchemy.sql.expression import func

@app.post("/preferences")
def save_preferences(data: PreferenceRequest):
    
    print("\nRAW REQUEST:")
    print(data.model_dump())

    user_sess = _get_user_session(data.user_id)

    user_sess.selected_moods = data.moods
    user_sess.selected_food_types = data.food_types
    user_sess.selected_cuisines = data.cuisines
    user_sess.selected_requirements = data.requirements
    user_sess.allergies = data.allergies

    print("=" * 50)
    print("PREFERENCES SAVED")
    print("MOODS:", user_sess.selected_moods)
    print("FOOD TYPES:", user_sess.selected_food_types)
    print("CUISINES:", user_sess.selected_cuisines)
    print("REQUIREMENTS:", user_sess.selected_requirements)
    print("ALLERGIES:", user_sess.allergies)
    print("=" * 50)

    return {"success": True}

'''
@app.post("/preference/init")
def init_user_preference(data: InitPreferenceRequest):
    """
    Menyimpan preferensi awal user (dipilih sebelum mulai swipe).
    Preferensi ini menjadi bobot dasar rekomendasi.
    """
    session_obj = _get_user_session(data.user_id)
    session_obj.initial_preferences = [p.lower() for p in data.preferences]

    # Tandai preferensi ke selected_requirements jika ada "halal" dll
    dietary = [p.lower() for p in data.preferences
               if p.lower() in ("halal", "vegetarian", "no seafood")]
    session_obj.selected_requirements = dietary

    return {
        "message": "Preferensi berhasil disimpan",
        "user_id": data.user_id,
        "preferences": session_obj.initial_preferences,
    }'''

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=request.message
        )
        return {
            "success": True,
            "reply": response.text
        }
    except Exception as e:
        return {
            "success": False,
            "reply": str(e)
        }

@app.post("/swipe")
def save_swipe(data: SwipeRequest):
    """
    Menyimpan hasil swipe user.
    - Swipe kanan (like)  → bobot atribut makanan bertambah
    - Swipe kiri (dislike)→ bobot atribut makanan berkurang sedikit
    Tidak lagi bergantung pada hitungan 5x swipe kanan.
    """
    swipe_history.append(data.dict())

    # Ambil food_text dari food_master untuk update bobot
    food_master, tfidf, tfidf_matrix = _get_rec_engine()
    food_row = food_master[food_master["food_id"] == data.food_id]
    food_text = food_row["food_text"].iloc[0] if not food_row.empty else ""

    user_sess = _get_user_session(data.user_id)
        
    food_master, _, _ = _get_rec_engine()

    liked_rows = food_master[
        food_master["food_id"].isin(user_sess.liked_foods)
    ]

    disliked_rows = food_master[
        food_master["food_id"].isin(user_sess.disliked_foods)
    ]

    print("\n" + "=" * 70)
    print("USER SWIPE PROFILE")
    print("=" * 70)

    print("\nLIKED:")

    for _, row in liked_rows.iterrows():
        print(
            f"- {row['food_id']} | {row['food_name']}"
        )

    print("\nDISLIKED:")

    for _, row in disliked_rows.iterrows():
        print(
            f"- {row['food_id']} | {row['food_name']}"
        )

    print("=" * 70)
    
    match = decide_match(
        food_id=data.food_id,
        action=data.action,
        user_session=user_sess,
        food_master=food_master,
    )
    food_match = check_food_match(
        user_sess,
        food_master,
        tfidf,
        tfidf_matrix
    )

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == data.user_id).first()
        if user:
            user.swipe = (user.swipe or 0) + 1
            if data.action == "like":
                user.like = (user.like or 0) + 1
            db.commit()
    finally:
        db.close()

    if food_match:
        print("=" * 50)
        print("FOOD MATCH FOUND")
        print(food_match)
        print("=" * 50)
        session = SessionLocal()
        user = session.query(User).filter(User.id == data.user_id).first()
        if user:
            user.match = (user.match or 0) + 1
            session.commit()
        session.close()
    print("SWIPE RECEIVED")
    print("USER :", data.user_id)
    print("FOOD :", data.food_id)
    print("ACTION :", data.action)
    return {
        "message": "Swipe saved",
        "data": data,
        "match": food_match,
        "session_summary": user_sess.summary(),
    }

@app.get("/swipe-history")
def get_swipe_history():
    return swipe_history


@app.get("/recommendations/personal/{user_id}")
def get_personal_recommendations(user_id: int, top_n: int = 10):
    """
    Mengembalikan rekomendasi makanan personal berdasarkan:
    - Preferensi awal user
    - Bobot kumulatif dari swipe kanan/kiri dalam sesi ini
    """
    food_master, tfidf, tfidf_matrix = _get_rec_engine()
    user_sess = _get_user_session(user_id)
    db = SessionLocal()

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user and user.allergy:
        user_sess.allergies = [
            x.strip().lower()
            for x in user.allergy.split(",")
        ]
    
    recommendations = get_top_recommendations(
        user_sess, food_master, tfidf, tfidf_matrix, top_n=top_n
    )

    if not recommendations:
        return {"user_id": user_id, "recommendations": []}

    result = []

    for row in recommendations:
        food = (
            db.query(Food)
            .filter(Food.id == int(row["food_id"]))
            .first()
        )
        if not food:
            continue
        result.append({
            "id": food.id,
            "food_id": food.id,
            "food_name": food.title_cleaned,
            "category": food.category,
            "taste_mood": row.get("taste_mood"),
            "ingredient": food.ingredients_cleaned,
            "img_url": food.img_url,
            "description": food.description,
            "origin_country": food.origin_country,
            "final_score":
                round(
                    float(row.get("final_score", 0)),
                    4
                ),
            "similarity_score":
                round(
                    float(row.get("similarity_score", 0)),
                    4
                )
        })
    db.close()
    print("TOTAL RECOMMENDATIONS:", len(recommendations))
    print("PERSONAL RECOMMENDATION REQUEST")
    print("USER:", user_id)
    
    print("\nRETURN TO FRONTEND")

    for i, r in enumerate(recommendations[:10]):
        print(
            i,
            r["food_id"],
            r["food_name"]
        )
        
    return {
        "user_id": user_id,
        "recommendations": result,
    }

class UserRegister(BaseModel):
    name: str
    username: str
    email: str
    password: str
    age: int
    phone: str
    city: str
    allergy: str
    gender: str

class UserLogin(BaseModel):
    username: str
    password: str

@app.post("/auth/register")
def register_user(data: UserRegister):
    session = SessionLocal()

    # Mapping nilai gender dari frontend ke format enum database
    gender_map = {
        "Male": "male",
        "Female": "female",
        "male": "male",
        "female": "female",
        "Laki-laki": "male",
        "Perempuan": "female",
    }
    gender_value = gender_map.get(data.gender, data.gender.lower())

    # Cek apakah username sudah dipakai
    existing_username = session.query(User).filter(
        User.username == data.username
    ).first()
    if existing_username:
        session.close()
        return {
            "success": False,
            "message": f"Username '{data.username}' sudah digunakan. Silakan pilih username lain."
        }

    # Cek apakah email sudah terdaftar
    existing_email = session.query(User).filter(
        User.email == data.email
    ).first()
    if existing_email:
        session.close()
        return {
            "success": False,
            "message": "Email sudah terdaftar."
        }

    new_user = User(
        name=data.name,
        username=data.username,
        email=data.email,
        password=data.password,
        age=data.age,
        phone=data.phone,
        city=data.city,
        allergy=data.allergy,
        gender=gender_value,
        like=0,
        swipe=0,
        match=0
    )
    session.add(new_user)
    try:
        session.commit()
        session.refresh(new_user)
        user_id = new_user.id
        user_name = new_user.name
        user_username = new_user.username
        user_email = new_user.email
        session.close()
        return {
            "success": True,
            "message": "Register successful",
            "user": {
                "id": user_id,
                "name": user_name,
                "username": user_username,
                "email": user_email,
                "like": 0,
                "swipe": 0,
                "match":0,
                "allergy": data.allergy,
                "city": data.city
            }
        }
    except Exception as e:
        session.rollback()
        session.close()
        return {
            "success": False,
            "message": f"Gagal menyimpan data: {str(e)}"
        }

@app.post("/auth/login")
def login_user(data: UserLogin):
    session = SessionLocal()
    user = session.query(User).filter(
        User.username == data.username,
        User.password == data.password
    ).first()
    session.close()
    if user:
        return {
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user.id,
                "name": user.name,
                "username": user.username,
                "email": user.email,
                "city": user.city,
                "like": user.like or 0,
                "swipe": user.swipe or 0,
                "match": user.match or 0,
                "allergy": user.allergy or ""
            }
        }
    return {
        "success": False,
        "message": "Username atau password salah."
    }

@app.post("/logout/{user_id}")
def logout(user_id: int):

    if user_id in _user_sessions:
        del _user_sessions[user_id]

    print(f"SESSION CLEARED: {user_id}")

    return {
        "message": "logout success"
    }

@app.get("/match/{food_name}/{user_id}")
def get_match(
    food_name: str,
    user_id: int
):
    """
    Trigger scraping Google Maps untuk food_name tertentu,
    menggunakan kota user sebagai lokasi pencarian,
    lalu simpan hasilnya ke database.
    """
    session = SessionLocal()
    try:
        # Ambil data user
        user = (
            session.query(User)
            .filter(User.id == user_id)
            .first()
        )
        city = ""
        if user:
            city = user.city or ""
        print("=" * 50)
        print("MATCH REQUEST")
        print("FOOD :", food_name)
        print("CITY :", city)
        print("=" * 50)
        restaurants_data = search_and_save(
            food_name=food_name,
            city=city
        )
        if restaurants_data:
            print("FIRST RESTAURANT:")
            print(restaurants_data[0])
        restaurants_data = sorted(
            restaurants_data,
            key=lambda x: (
                x.get("rating") or 0
            ),
            reverse=True
        )
    except Exception as e:
        print(f"[WARN] Scraping gagal: {e}")

        # Fallback ambil dari database
        try:

            existing = (
                session.query(Restaurant)
                .filter(
                    Restaurant.food_name.ilike(
                        f"%{food_name}%"
                    )
                )
                .order_by(
                    Restaurant.rating.desc()
                )
                .limit(10)
                .all()
            )
            restaurants_data = [
                {
                    "id": r.id,
                    "restaurant_name": r.restaurant_name,
                    "food_name": r.food_name,
                    "rating": r.rating,
                    "count_rating": r.count_rating,
                    "city": r.city,
                    "address": r.address,
                    "latitude": r.latitude,
                    "longitude": r.longitude,
                }
                for r in existing
            ]
        except Exception as db_error:
            print(
                f"[WARN] Database fallback gagal: {db_error}"
            )
            restaurants_data = []
    finally:
        session.close()
    return {
        "matched_food": food_name,
        "search_city": city,
        "restaurants": restaurants_data,
        "total": len(restaurants_data)
    }

@app.get("/recommendations")
def get_recommendations():
    session = SessionLocal()
    foods = session.query(Restaurant).order_by(Restaurant.rating.desc()).all()
    result = []
    for food in foods:
        result.append({
            "id": food.id,
            "food_name": food.food_name,
            "rating": food.rating
        })
    session.close()
    return result

@app.get("/nearby")
def get_nearby():
    session = SessionLocal()
    foods = session.query(Restaurant).order_by(Restaurant.distance.asc()).all()
    result = []
    for food in foods:
        result.append({
            "id": food.id,
            "food_name": food.food_name,
            "distance": food.distance
        })
    session.close()
    return result

@app.get("/user/preferences/{user_id}")
def get_user_preferences(user_id: int):
    session = SessionLocal()
    user_swipes = [
        item for item in swipe_history
        if item["user_id"] == user_id
    ]
    liked_food_ids = [
        item["food_id"]
        for item in user_swipes
        if item["action"] == "like"
    ]
    liked_foods = session.query(Restaurant).filter(
        Restaurant.id.in_(liked_food_ids)
    ).all()
    result = []
    for food in liked_foods:
        result.append({
            "id": food.id,
            "food_name": food.food_name,
            "restaurant_name": food.restaurant_name,
            "city": food.city
        })
    session.close()

    return {
        "user_id": user_id,
        "total_swipes": len(user_swipes),
        "liked_foods": result
    }