from fastapi import APIRouter
from database.db import SessionLocal
from database.models import Restaurant

router = APIRouter(
    prefix="/restaurants",
    tags=["Restaurants"]
)


@router.get("/")
def get_restaurants():

    session = SessionLocal()

    restaurants = session.query(Restaurant).all()

    result = []

    for item in restaurants:
        result.append({
            "id": item.id,
            "restaurant_name": item.restaurant_name,
            "rating": item.rating,
            "city": item.city,
            "count_rating": item.count_rating,
            "food_name": item.food_name,
            "description": item.description,
            "origin_coutry": item.origin_country,
            "img_url": item.img_url
        })

    session.close()

    return result


@router.get("/{restaurant_id}")
def get_restaurant_detail(restaurant_id: int):

    session = SessionLocal()

    restaurant = session.query(Restaurant).filter(
        Restaurant.id == restaurant_id
    ).first()

    session.close()

    return restaurant