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

foods = [
    {
        "id": 1,
        "name": "Nasi Goreng",
        "restaurant": "Warung Nusantara",
        "rating": 4.8,
        "distance": 1.2
    },
    {
        "id": 2,
        "name": "Ramen",
        "restaurant": "Tokyo Bowl",
        "rating": 4.7,
        "distance": 2.5
    }
]

swipe_history = []

class SwipeRequest(BaseModel):
    user_id: int
    food_id: int
    action: str

@app.get("/")
def home():
    return {"message": "FooDer Backend Running"}

@app.get("/foods")
def get_foods():
    return foods

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
    sorted_foods = sorted(foods, key=lambda x: x["rating"], reverse=True)
    return sorted_foods

@app.get("/nearby")
def get_nearby():
    sorted_foods = sorted(foods, key=lambda x: x["distance"])
    return sorted_foods

@app.get("/user/preferences/{user_id}")
def get_user_preferences(user_id: int):
    user_swipes = [item for item in swipe_history if item["user_id"] == user_id]

    liked_food_ids = [
        item["food_id"] for item in user_swipes if item["action"] == "like"
    ]

    liked_foods = [
        food for food in foods if food["id"] in liked_food_ids
    ]

    return {
        "user_id": user_id,
        "total_swipes": len(user_swipes),
        "liked_foods": liked_foods
    }
