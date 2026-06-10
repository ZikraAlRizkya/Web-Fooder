from fastapi import APIRouter
from Fooder.backend.database.db import SessionLocal
from Fooder.backend.database.models import User

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.get("/")
def get_users():

    session = SessionLocal()

    users = session.query(User).all()

    result = []

    for item in users:
        result.append({
            "id": item.id,
            "name": item.name,
            "username": item.username,
            "email": item.email,
            "password": item.password,
            "age": item.age,
            "city": item.city,
            "allergy": item.allergy,
            "phone": item.phone,
            "gender": item.gender,
            "like": item.like,
            "swipe": item.swipe,
            "match": item.match
        })

    session.close()

    return result