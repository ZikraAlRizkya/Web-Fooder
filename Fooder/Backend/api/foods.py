from fastapi import APIRouter
from Fooder.backend.database.db import SessionLocal
from Fooder.backend.database.models import Food

router = APIRouter(
    prefix="/foods",
    tags=["Foods"]
)


@router.get("/")
def get_foods():

    session = SessionLocal()

    foods = session.query(Food).limit(10).all()

    result = []

    for item in foods:
        result.append({
            "id": item.id,
            "food_name": item.title_cleaned,
            "category": item.category,
            "ingredient": item.ingredients_cleaned,
            "img_url": item.img_url,
            "description": item.description,
            "origin_country": item.origin_country
        })

    session.close()

    return result


@router.get("/{food_id}")
def get_food_detail(food_id: int):

    session = SessionLocal()

    food = session.query(Food).filter(
        Food.id == food_id
    ).first()

    session.close()

    return food