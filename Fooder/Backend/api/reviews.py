from fastapi import APIRouter
from typing import List, Optional

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)


@router.get("/{restaurant_id}")
def get_reviews(restaurant_id: int):
    """
    Ambil semua review untuk satu restoran.
    Mengembalikan list review dari database.
    """
    try:
        from database.db import SessionLocal
        from database.models import Review

        session = SessionLocal()
        reviews = session.query(Review).filter(
            Review.restaurant_id == restaurant_id
        ).all()

        result = []
        for review in reviews:
            result.append({
                "username": review.username,
                "review": review.review_text,
                "rating": review.rating,
            })

        session.close()
        return result

    except Exception as e:
        return {
            "message": f"Database belum tersedia: {e}",
            "data": []
        }
