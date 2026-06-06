from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from Fooder.backend.database.db import SessionLocal
from Fooder.backend.database.models import Review, Restaurant

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)


# ── Schema untuk POST ─────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    restaurant_id: int
    username:      Optional[str]   = "Anonymous"
    review_text:   Optional[str]   = None
    rating:        Optional[float] = None


# ── GET – ambil semua review milik satu restoran ──────────────────────────────

@router.get("/{restaurant_id}")
def get_reviews(restaurant_id: int):
    session = SessionLocal()
    try:
        reviews = session.query(Review).filter(
            Review.restaurant_id == restaurant_id
        ).all()
        return [
            {
                "id":       r.id,
                "username": r.username,
                "review":   r.review_text,
                "rating":   r.rating,
            }
            for r in reviews
        ]
    except Exception as e:
        return {"message": f"Database belum tersedia: {e}", "data": []}
    finally:
        session.close()


# ── POST – tambah review baru ─────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_review(payload: ReviewCreate):
    session = SessionLocal()
    try:
        restaurant = session.query(Restaurant).filter(
            Restaurant.id == payload.restaurant_id
        ).first()
        if not restaurant:
            raise HTTPException(
                status_code=404,
                detail=f"Restaurant dengan id={payload.restaurant_id} tidak ditemukan"
            )
        new_review = Review(
            restaurant_id = payload.restaurant_id,
            username      = payload.username,
            review_text   = payload.review_text,
            rating        = payload.rating,
        )
        session.add(new_review)
        session.commit()
        session.refresh(new_review)
        return {
            "id":            new_review.id,
            "restaurant_id": new_review.restaurant_id,
            "username":      new_review.username,
            "review_text":   new_review.review_text,
            "rating":        new_review.rating,
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()