"""
app.py — FooDer Backend (Main)
==============================
Menjalankan dua service:
  - Backend utama  : http://127.0.0.1:8000
  - Sentiment API  : http://127.0.0.1:8001 (atau bisa diintegrasikan di sini)

Untuk development, jalankan:
  uvicorn app:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="FooDer Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import router API utama
try:
    from api import restaurants
    app.include_router(restaurants.router)
except Exception as e:
    print(f"[WARN] restaurants router gagal dimuat: {e}")

try:
    from api import users
    app.include_router(users.router)
except Exception as e:
    print(f"[WARN] users router gagal dimuat: {e}")

try:
    from api import reviews
    app.include_router(reviews.router)
except Exception as e:
    print(f"[WARN] reviews router gagal dimuat: {e}")

# ── [NEW] Integrasikan Sentiment API ke dalam backend utama ──────────────────
# Ini memungkinkan frontend memanggil /sentiment/* dan /review/*
# dari satu base URL yang sama (port 8000), tanpa perlu port terpisah.
try:
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "sentiment"))
    from sentiment.routes.sentiment import router as sentiment_router
    from sentiment.routes.review import router as review_router
    app.include_router(sentiment_router)
    app.include_router(review_router)
    print("[OK] Sentiment & Review routers berhasil dimuat.")
except Exception as e:
    print(f"[WARN] Sentiment router gagal dimuat: {e}")
    print("      Jalankan sentiment API secara terpisah dengan:")
    print("      cd sentiment && uvicorn main:app --port 8001")


# Endpoint dasar
@app.get("/")
def home():
    return {
        "message": "FooDer Backend Running",
        "endpoints": {
            "restaurants": "/restaurants/",
            "sentiment_predict": "/sentiment/predict",
            "review_insight": "/review/insight",
            "sentiment_from_db": "/sentiment/restaurant/{id}",
            "review_from_db": "/review/insight/{id}",
        }
    }


# Swipe History (in-memory, sementara sampai DB siap)
swipe_history = []


class SwipeRequest(BaseModel):
    user_id: int
    food_id: int
    action: str


@app.post("/swipe")
def save_swipe(data: SwipeRequest):
    swipe_history.append(data.dict())
    return {"message": "Swipe saved", "data": data}


@app.get("/swipe-history")
def get_swipe_history():
    return swipe_history


# Auth
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
    email: str
    password: str


@app.post("/auth/register")
def register_user(data: UserRegister):
    try:
        from database.db import SessionLocal
        from database.models import User
        session = SessionLocal()
        existing = session.query(User).filter(User.email == data.email).first()
        if existing:
            session.close()
            return {"message": "Email already registered"}
        new_user = User(**data.dict())
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        session.close()
        return {"message": "Register successful", "user": {"id": new_user.id, "name": new_user.name}}
    except Exception as e:
        return {"message": f"Database belum tersedia: {e}"}


@app.post("/auth/login")
def login_user(data: UserLogin):
    try:
        from database.db import SessionLocal
        from database.models import User
        session = SessionLocal()
        user = session.query(User).filter(
            User.email == data.email, User.password == data.password
        ).first()
        session.close()
        if user:
            return {"message": "Login successful", "user": {"id": user.id, "name": user.name}}
        return {"message": "Invalid email or password"}
    except Exception as e:
        return {"message": f"Database belum tersedia: {e}"}


# Recommendations
@app.get("/recommendations")
def get_recommendations():
    try:
        from database.db import SessionLocal
        from database.models import Restaurant
        session = SessionLocal()
        foods = session.query(Restaurant).order_by(Restaurant.rating.desc()).all()
        result = [
            {"id": f.id, "food_name": f.food_name, "rating": f.rating}
            for f in foods
        ]
        session.close()
        return result
    except Exception as e:
        return {"message": f"Database belum tersedia: {e}", "data": []}


@app.get("/user/preferences/{user_id}")
def get_user_preferences(user_id: int):
    user_swipes = [s for s in swipe_history if s["user_id"] == user_id]
    liked_ids = [s["food_id"] for s in user_swipes if s["action"] == "like"]
    return {"user_id": user_id, "total_swipes": len(user_swipes), "liked_food_ids": liked_ids}
