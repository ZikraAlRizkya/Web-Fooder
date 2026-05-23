from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from Backend.api import restaurants
from Backend.database.db import SessionLocal
from Backend.database.models import Restaurant


app = FastAPI(title="FooDer Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


swipe_history = []

class SwipeRequest(BaseModel):
    user_id: int
    food_id: int
    action: str


@app.get("/")
def home():
    return {"message": "FooDer Backend Running"}


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

users = []
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/auth/register")
def register_user(data: UserRegister):
    new_user = {
        "id": len(users) + 1,
        "name": data.name,
        "email": data.email,
        "password": data.password
    }
    users.append(new_user)

    return {
        "message": "Register successful",
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"]
        }
    }

@app.post("/auth/login")
def login_user(data: UserLogin):
    for user in users:
        if user["email"] == data.email and user["password"] == data.password:
            return {
                "message": "Login successful",
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"]
                }
            }

    return {"message": "Invalid email or password"}

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
            "description": food.description
        })
    session.close()
    return {
        "user_id": user_id,
        "total_swipes": len(user_swipes),
        "liked_foods": result
    }
