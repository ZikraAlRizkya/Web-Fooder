from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

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
                "id":          review.id,
                "username":    review.username,
                "review":      review.review_text,
                "rating":      review.rating,
            })
        session.close()
        return result
    except Exception as e:
        return {"message": f"Database belum tersedia: {e}", "data": []}


# ── POST – tambah review baru ─────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_review(payload: ReviewCreate):
    """
    Simpan satu review baru ke database.
    `restaurant_id` di payload menjadi foreign key ke tabel restaurants.
    """
    try:
        from database.db import SessionLocal
        from database.models import Review, Restaurant

        session = SessionLocal()

        # Pastikan restaurant_id valid
        restaurant = session.query(Restaurant).filter(
            Restaurant.id == payload.restaurant_id
        ).first()
        if not restaurant:
            session.close()
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

        result = {
            "id":            new_review.id,
            "restaurant_id": new_review.restaurant_id,
            "username":      new_review.username,
            "review_text":   new_review.review_text,
            "rating":        new_review.rating,
        }
        session.close()
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))