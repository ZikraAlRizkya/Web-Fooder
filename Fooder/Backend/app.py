from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from api import restaurants
from api.restaurants import get_restaurants
from api import users
from database.db import SessionLocal
from database.models import Restaurant, User

app = FastAPI(title="FooDer Backend")
from database.db import Base, engine
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurants.router)
app.include_router(users.router)


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
    action: str


@app.post("/swipe")
def save_swipe(data: SwipeRequest):
    swipe_history.append(data.dict())

    return {
        "message": "Swipe saved",
        "data": data
    }

@app.get("/swipe-history")
def get_swipe_history():
    return swipe_history

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
    session = SessionLocal()
    existing_user = session.query(User).filter(
        User.email == data.email
    ).first()
    if existing_user:
        session.close()
        return {
            "message": "Email already registered"
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
        gender=data.gender
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    session.close()
    return {
        "message": "Register successful",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email
        }
    }

@app.post("/auth/login")
def login_user(data: UserLogin):
    session = SessionLocal()
    user = session.query(User).filter(
        User.email == data.email,
        User.password == data.password
    ).first()
    session.close()
    if user:
        return {
            "message": "Login successful",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email
            }
        }
    return {
        "message": "Invalid email or password"
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