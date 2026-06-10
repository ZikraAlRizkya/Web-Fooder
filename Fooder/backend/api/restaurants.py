from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from Fooder.backend.database.db import SessionLocal
from Fooder.backend.database.models import Restaurant

router = APIRouter(
    prefix="/restaurants",
    tags=["Restaurants"]
)


# ── Schema untuk POST ─────────────────────────────────────────────────────────

class RestaurantCreate(BaseModel):
    restaurant_name: str
    address:         Optional[str] = None
    city:            Optional[str] = None
    latitude:        Optional[float] = None
    longitude:       Optional[float] = None
    rating:          Optional[float] = None
    count_rating:    Optional[int]   = None
    food_name:       Optional[str]   = None
    description:     Optional[str] = None
    img_url:         Optional[str] = None
    gmaps_url:       Optional[str] = None


# ── GET all ───────────────────────────────────────────────────────────────────

@router.get("/")
def get_restaurants():
    session = SessionLocal()
    restaurants = session.query(Restaurant).all()
    result = []
    for item in restaurants:
        result.append({
            "id":             item.id,
            "restaurant_name": item.restaurant_name,
            "rating":          item.rating,
            "city":            item.city,
            "count_rating":    item.count_rating,
            "food_name":       item.food_name,
            "description":     item.description,
            "img_url":         item.img_url,
            "gmaps_url":       item.gmaps_url
        })
    session.close()
    return result


# ── GET by id ─────────────────────────────────────────────────────────────────

@router.get("/{restaurant_id}")
def get_restaurant_detail(restaurant_id: int):
    session = SessionLocal()
    restaurant = session.query(Restaurant).filter(
        Restaurant.id == restaurant_id
    ).first()
    session.close()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant tidak ditemukan")
    return restaurant


# ── POST – tambah restoran baru ───────────────────────────────────────────────

@router.post("/", status_code=201)
def create_restaurant(payload: RestaurantCreate):
    """
    Simpan satu restoran baru ke database.
    Mengembalikan data restoran beserta `id` yang baru dibuat.
    """
    session = SessionLocal()
    try:
        new_restaurant = Restaurant(
            restaurant_name = payload.restaurant_name,
            address         = payload.address,
            city            = payload.city,
            latitude        = payload.latitude,
            longitude       = payload.longitude,
            rating          = payload.rating,
            count_rating    = payload.count_rating,
            food_name       = payload.food_name,
            description     = payload.description,
            img_url         = payload.img_url,
            gmaps_url       = payload.gmaps_url
        )
        session.add(new_restaurant)
        session.commit()
        session.refresh(new_restaurant)
        return {
            "id":              new_restaurant.id,
            "restaurant_name": new_restaurant.restaurant_name,
            "rating":          new_restaurant.rating,
            "city":            new_restaurant.city,
            "count_rating":    new_restaurant.count_rating,
            "food_name":       new_restaurant.food_name,
            "description":     new_restaurant.description,
            "img_url":         new_restaurant.img_url,
            "gmaps_url":       new_restaurant.gmaps_url
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()