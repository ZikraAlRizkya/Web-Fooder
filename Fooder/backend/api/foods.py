from fastapi import APIRouter
from Fooder.backend.database.db import SessionLocal
from Fooder.backend.database.models import Food
from sqlalchemy import func

router = APIRouter(
    prefix="/foods",
    tags=["Foods"]
)


@router.get("/")
def get_foods():

    session = SessionLocal()

    foods = (
    session.query(Food)
    .order_by(func.random())
    .limit(10)
    .all()
)

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

@router.get("/search")
def search_foods(
    keyword: str = "",
    cuisine: str = "All",
    limit: int = 20
):
    print(
        "SEARCH:",
        keyword,
        cuisine,
        limit
    )
    db = SessionLocal()
    query = db.query(Food)
    if cuisine.lower() != "all":
        query = query.filter(
            Food.origin_country.ilike(cuisine)
        )
    if keyword.strip():
        query = query.filter(
            Food.title_cleaned.ilike(
                f"%{keyword}%"
            )
        )
    foods = query.limit(limit).all()
    result = []
    for food in foods:
        result.append({
            "id": food.id,
            "food_name": food.title_cleaned,
            "category": food.category,
            "origin_country": food.origin_country,
            "img_url": food.img_url
        })
    db.close()
    return result

@router.get("/cuisine/{cuisine}")
def get_foods_by_cuisine(
    cuisine: str,
    limit: int = 20
):
    db = SessionLocal()
    foods = (
        db.query(Food)
        .filter(
            Food.origin_country.ilike(cuisine)
        )
        .order_by(func.random())  # RANDOM
        .limit(limit)
        .all()
    )
    result = []
    for food in foods:
        result.append({
            "id": food.id,
            "food_name": food.title_cleaned,
            "category": food.category,
            "origin_country": food.origin_country,
            "img_url": food.img_url
        })
    db.close()
    return result

@router.get("/detail/{food_id}")
def get_food_detail(food_id: int):

    session = SessionLocal()

    food = session.query(Food).filter(
        Food.id == food_id
    ).first()

    session.close()

    return food