"""
routes/sentiment.py
===================
NLP API — Sentiment Analysis Endpoints

Endpoints:
  POST /sentiment/predict            → Prediksi sentimen satu review
  POST /sentiment/predict-batch      → Prediksi sentimen banyak review
  POST /sentiment/restaurant-score   → Sentiment score agregat restoran
  POST /sentiment/from-db            → Ambil review dari DB lalu analisis (NEW)
  GET  /sentiment/restaurant/{id}    → Ambil & analisis review restoran dari DB (NEW)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

from services.sentiment_service import get_sentiment_service

router = APIRouter(prefix="/sentiment", tags=["Sentiment Analysis"])


# ── Request / Response Models ─────────────────────────────────────────────────

class SingleReviewRequest(BaseModel):
    review: str = Field(..., min_length=1, example="Makanannya enak banget, porsinya besar!")


class BatchReviewRequest(BaseModel):
    reviews: List[str] = Field(
        ...,
        min_items=1,
        max_items=100,
        example=["Enak sekali!", "Tempat kotor dan lambat.", "Biasa aja sih."],
    )


class RestaurantScoreRequest(BaseModel):
    restaurant_id: str = Field(..., example="resto_001")
    reviews: List[str] = Field(..., min_items=1)


class SentimentPrediction(BaseModel):
    label: str
    score: float
    numeric_score: float
    backend_used: str


class BatchSentimentResponse(BaseModel):
    results: List[dict]
    total: int


class RestaurantScoreResponse(BaseModel):
    restaurant_id: str
    sentiment_score: float
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    total_reviews: int
    interpretation: str
    backend_used: str


# ── Helper ────────────────────────────────────────────────────────────────────

def _interpret_score(score: float) -> str:
    if score >= 0.75:
        return "Sangat positif — pengguna sangat puas"
    elif score >= 0.55:
        return "Cukup positif — pengguna umumnya puas"
    elif score >= 0.40:
        return "Netral — pendapat pengguna beragam"
    elif score >= 0.25:
        return "Cukup negatif — banyak pengguna tidak puas"
    else:
        return "Sangat negatif — sebagian besar pengguna kecewa"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/predict", response_model=SentimentPrediction)
def predict_sentiment(req: SingleReviewRequest):
    """Prediksi sentimen satu teks review."""
    if not req.review.strip():
        raise HTTPException(status_code=400, detail="Review tidak boleh kosong.")

    svc = get_sentiment_service()
    result = svc.predict(req.review)

    return SentimentPrediction(
        label=result.label,
        score=result.score,
        numeric_score=result.numeric_score,
        backend_used=svc.backend,
    )


@router.post("/predict-batch", response_model=BatchSentimentResponse)
def predict_sentiment_batch(req: BatchReviewRequest):
    """Prediksi sentimen untuk banyak review sekaligus (maks 100)."""
    svc = get_sentiment_service()
    results = svc.predict_batch(req.reviews)

    return BatchSentimentResponse(
        results=[
            {
                "review": req.reviews[i],
                "label": r.label,
                "score": r.score,
                "numeric_score": r.numeric_score,
            }
            for i, r in enumerate(results)
        ],
        total=len(results),
    )


@router.post("/restaurant-score", response_model=RestaurantScoreResponse)
def get_restaurant_sentiment_score(req: RestaurantScoreRequest):
    """
    Hitung sentiment score agregat restoran dari kumpulan review.
    
    Digunakan oleh frontend untuk menampilkan hasil sentimen
    setelah user menentukan preferensi makanan.
    """
    svc = get_sentiment_service()
    agg = svc.compute_restaurant_sentiment_score(req.reviews)

    return RestaurantScoreResponse(
        restaurant_id=req.restaurant_id,
        **agg,
        interpretation=_interpret_score(agg["sentiment_score"]),
        backend_used=svc.backend,
    )


@router.get("/restaurant/{restaurant_id}")
def get_restaurant_sentiment_from_db(restaurant_id: int):
    """
    [NEW] Ambil review restoran dari database lalu analisis sentimennya.
    
    Endpoint ini menghubungkan sentiment service dengan database.
    Digunakan saat database sudah siap dan berisi data review dari Google Maps scraping.
    
    Returns:
        Sentiment score + breakdown + interpretasi untuk ditampilkan di frontend.
    """
    try:
        # Import DB di sini agar sentiment service bisa berdiri sendiri
        # jika database belum siap
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        from database.db import SessionLocal
        from database.models import Review

        session = SessionLocal()
        reviews_db = session.query(Review).filter(
            Review.restaurant_id == restaurant_id
        ).all()
        session.close()

        if not reviews_db:
            return {
                "restaurant_id": restaurant_id,
                "sentiment_score": None,
                "message": "Belum ada review untuk restoran ini.",
                "total_reviews": 0,
            }

        review_texts = [r.review_text for r in reviews_db if r.review_text]

        if not review_texts:
            return {
                "restaurant_id": restaurant_id,
                "sentiment_score": None,
                "message": "Review ada tapi teksnya kosong.",
                "total_reviews": len(reviews_db),
            }

        svc = get_sentiment_service()
        agg = svc.compute_restaurant_sentiment_score(review_texts)

        return {
            "restaurant_id": restaurant_id,
            **agg,
            "interpretation": _interpret_score(agg["sentiment_score"]),
            "backend_used": svc.backend,
        }

    except Exception as e:
        # Jika DB belum tersedia, kembalikan error yang informatif
        raise HTTPException(
            status_code=503,
            detail=f"Database belum tersedia: {str(e)}. Gunakan endpoint POST /sentiment/restaurant-score dengan review manual."
        )
