"""
routes/review.py
================
NLP API — Review Intelligence Endpoints

Endpoints:
  POST /review/insight              → Analisis lengkap review (insight + keyword + %)
  POST /review/summarize            → Rangkum review secara otomatis
  GET  /review/insight/{id}         → Insight dari DB (NEW, butuh DB)
  GET  /review/health               → Cek status service
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

from services.review_service import get_review_service

router = APIRouter(prefix="/review", tags=["Review Intelligence"])


# ── Request / Response Models ─────────────────────────────────────────────────

class ReviewInsightRequest(BaseModel):
    restaurant_id: str = Field(..., example="resto_001")
    restaurant_name: str = Field(..., example="Warung Pak Joko")
    reviews: List[str] = Field(
        ...,
        min_items=1,
        example=[
            "Makanannya enak banget, sate ayamnya juara!",
            "Porsinya besar tapi agak lama nunggu.",
            "Harga murah, rasa mantap, recommended!",
        ],
    )
    top_n: int = Field(default=3, ge=1, le=10)


class SummarizeRequest(BaseModel):
    restaurant_id: str = Field(..., example="resto_001")
    reviews: List[str] = Field(..., min_items=1)
    max_sentences: int = Field(default=3, ge=1, le=5)


class ReviewInsightResponse(BaseModel):
    restaurant_id: str
    restaurant_name: str
    sentiment_score: float
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    total_reviews: int
    human_readable_summary: str
    auto_summary: str
    dominant_positive_keywords: List[str]
    dominant_negative_keywords: List[str]
    top_positive_reviews: List[str]
    top_negative_reviews: List[str]
    backend_used: str


class SummarizeResponse(BaseModel):
    restaurant_id: str
    summary: str
    representative_reviews: List[str]
    keyword_highlights: List[str]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health")
def health_check():
    """Cek status Review Intelligence service."""
    svc = get_review_service()
    return {
        "status": "ok",
        "service": "Review Intelligence",
        "sentiment_backend": svc._sentiment_svc.backend,
    }


@router.post("/insight", response_model=ReviewInsightResponse)
def get_review_insight(req: ReviewInsightRequest):
    """
    Analisis lengkap review restoran.

    Mengembalikan:
    - Persentase sentimen (positif/netral/negatif)
    - Kata kunci dominan positif & negatif
    - Review positif dan negatif terbaik
    - Ringkasan otomatis
    - Kalimat human-readable (contoh: "78% pengguna puas")

    Digunakan di halaman hasil rekomendasi pada frontend FooDer.
    """
    if not req.reviews:
        raise HTTPException(status_code=400, detail="Reviews tidak boleh kosong.")

    svc = get_review_service()
    insight = svc.get_review_insight(req.reviews, top_n=req.top_n)

    return ReviewInsightResponse(
        restaurant_id=req.restaurant_id,
        restaurant_name=req.restaurant_name,
        sentiment_score=insight.sentiment_score,
        positive_pct=insight.positive_pct,
        neutral_pct=insight.neutral_pct,
        negative_pct=insight.negative_pct,
        total_reviews=insight.total_reviews,
        human_readable_summary=insight.human_readable_summary,
        auto_summary=insight.summary_sentence,
        dominant_positive_keywords=insight.dominant_positive_keywords,
        dominant_negative_keywords=insight.dominant_negative_keywords,
        top_positive_reviews=insight.top_positive_reviews,
        top_negative_reviews=insight.top_negative_reviews,
        backend_used=svc._sentiment_svc.backend,
    )


@router.get("/insight/{restaurant_id}")
def get_review_insight_from_db(restaurant_id: int, restaurant_name: str = "Restoran", top_n: int = 3):
    """
    [NEW] Ambil review dari database lalu buat insight sentimen.
    
    Endpoint ini untuk digunakan setelah database tersedia.
    Teman yang mengerjakan database cukup memastikan tabel 'reviews'
    berisi kolom: restaurant_id, review_text, rating, username.
    """
    try:
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
            raise HTTPException(
                status_code=404,
                detail=f"Tidak ada review untuk restoran ID {restaurant_id}."
            )

        review_texts = [r.review_text for r in reviews_db if r.review_text and r.review_text.strip()]

        if not review_texts:
            raise HTTPException(status_code=404, detail="Semua review kosong.")

        svc = get_review_service()
        insight = svc.get_review_insight(review_texts, top_n=top_n)

        return {
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant_name,
            "sentiment_score": insight.sentiment_score,
            "positive_pct": insight.positive_pct,
            "neutral_pct": insight.neutral_pct,
            "negative_pct": insight.negative_pct,
            "total_reviews": insight.total_reviews,
            "human_readable_summary": insight.human_readable_summary,
            "auto_summary": insight.summary_sentence,
            "dominant_positive_keywords": insight.dominant_positive_keywords,
            "dominant_negative_keywords": insight.dominant_negative_keywords,
            "top_positive_reviews": insight.top_positive_reviews,
            "top_negative_reviews": insight.top_negative_reviews,
            "backend_used": svc._sentiment_svc.backend,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Database belum tersedia: {str(e)}. Gunakan POST /review/insight dengan review manual."
        )


@router.post("/summarize", response_model=SummarizeResponse)
def summarize_reviews(req: SummarizeRequest):
    """
    Rangkum review secara otomatis menggunakan TF-IDF Extractive Summarization.
    """
    if not req.reviews:
        raise HTTPException(status_code=400, detail="Reviews tidak boleh kosong.")

    svc = get_review_service()
    result = svc.summarize_reviews(req.reviews, max_sentences=req.max_sentences)

    return SummarizeResponse(
        restaurant_id=req.restaurant_id,
        summary=result.summary,
        representative_reviews=result.representative_reviews,
        keyword_highlights=result.keyword_highlights,
    )
