"""
sentiment_service.py
====================
Sentiment Analysis Engine untuk FooDer.

Prioritas model:
  1. IndoBERT (mdhugol/indonesia-bert-sentiment-classifier) — akurasi terbaik
  2. TF-IDF + Logistic Regression (fallback lokal)
  3. Dummy keyword-based scorer (last resort)

Label: positif | netral | negatif
"""

from __future__ import annotations

import logging
import os
import pickle
from dataclasses import dataclass
from typing import Literal

import numpy as np
from utils.text_cleaning import clean_text

logger = logging.getLogger(__name__)

# ── Konstanta ─────────────────────────────────────────────────────────────────
INDOBERT_MODEL = "mdhugol/indonesia-bert-sentiment-classifier"

# Path model relatif terhadap file ini
_HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_HERE, "..", "app", "models", "sentiment_model.pkl")
VECTORIZER_PATH = os.path.join(_HERE, "..", "app", "models", "tfidf_vectorizer.pkl")

# Mapping label IndoBERT → label FooDer
LABEL_MAP = {
    "LABEL_0": "negatif",
    "LABEL_1": "netral",
    "LABEL_2": "positif",
}

SentimentLabel = Literal["positif", "netral", "negatif"]

NUMERIC_SCORE_MAP: dict[SentimentLabel, float] = {
    "positif": 1.0,
    "netral": 0.5,
    "negatif": 0.0,
}


# ── Data class hasil prediksi ─────────────────────────────────────────────────
@dataclass
class SentimentResult:
    label: SentimentLabel
    score: float          # confidence model (0.0–1.0)
    numeric_score: float  # negatif=0.0, netral=0.5, positif=1.0


# ── Sentiment Service ─────────────────────────────────────────────────────────
class SentimentService:
    """
    Layanan prediksi sentimen dengan fallback otomatis.
    Urutan: IndoBERT → TF-IDF → Dummy.
    """

    def __init__(self):
        self._pipeline = None
        self._tfidf_model = None
        self._tfidf_vectorizer = None
        self._backend: str = "none"
        self._load_model()

    # ── Loading ───────────────────────────────────────────────────────────────
    def _load_model(self):
        if self._try_load_indobert():
            self._backend = "indobert"
            logger.info("IndoBERT loaded successfully.")
        elif self._try_load_tfidf():
            self._backend = "tfidf"
            logger.info("TF-IDF fallback model loaded.")
        else:
            logger.warning("Tidak ada model tersedia. Menggunakan dummy scorer.")
            self._backend = "dummy"

    def _try_load_indobert(self) -> bool:
        try:
            from transformers import pipeline
            self._pipeline = pipeline(
                "text-classification",
                model=INDOBERT_MODEL,
                tokenizer=INDOBERT_MODEL,
                top_k=None,
            )
            return True
        except Exception as e:
            logger.warning(f"IndoBERT gagal dimuat: {e}")
            return False

    def _try_load_tfidf(self) -> bool:
        try:
            model_path = os.path.normpath(MODEL_PATH)
            vec_path = os.path.normpath(VECTORIZER_PATH)
            with open(model_path, "rb") as f:
                self._tfidf_model = pickle.load(f)
            with open(vec_path, "rb") as f:
                self._tfidf_vectorizer = pickle.load(f)
            return True
        except Exception as e:
            logger.warning(f"TF-IDF model gagal dimuat: {e}")
            return False

    # ── Prediksi tunggal ──────────────────────────────────────────────────────
    def predict(self, review_text: str) -> SentimentResult:
        """
        Prediksi sentimen satu review.
        
        Args:
            review_text: Teks review mentah (belum di-clean).
        
        Returns:
            SentimentResult dengan label, confidence score, dan numeric score.
        """
        cleaned = clean_text(review_text, remove_stopwords=False)

        if not cleaned.strip():
            return SentimentResult(label="netral", score=0.5, numeric_score=0.5)

        if self._backend == "indobert":
            return self._predict_indobert(cleaned)
        elif self._backend == "tfidf":
            return self._predict_tfidf(cleaned)
        else:
            return self._predict_dummy(cleaned)

    def _predict_indobert(self, cleaned_text: str) -> SentimentResult:
        # Potong teks panjang (IndoBERT max 512 token)
        truncated = " ".join(cleaned_text.split()[:400])
        results = self._pipeline(truncated)[0]
        best = max(results, key=lambda x: x["score"])
        label: SentimentLabel = LABEL_MAP.get(best["label"], "netral")
        return SentimentResult(
            label=label,
            score=round(best["score"], 4),
            numeric_score=NUMERIC_SCORE_MAP[label],
        )

    def _predict_tfidf(self, cleaned_text: str) -> SentimentResult:
        vec = self._tfidf_vectorizer.transform([cleaned_text])
        proba = self._tfidf_model.predict_proba(vec)[0]
        classes = self._tfidf_model.classes_
        best_idx = int(np.argmax(proba))
        label: SentimentLabel = classes[best_idx]
        return SentimentResult(
            label=label,
            score=round(float(proba[best_idx]), 4),
            numeric_score=NUMERIC_SCORE_MAP.get(label, 0.5),
        )

    def _predict_dummy(self, cleaned_text: str) -> SentimentResult:
        """Scorer berbasis kata kunci (last resort)."""
        POSITIVE_WORDS = {
            "enak", "lezat", "mantap", "bagus", "baik", "suka", "segar",
            "rekomendasi", "recommended", "worth", "puas", "ramah", "cepat",
            "bersih", "murah", "terjangkau", "nikmat", "istimewa", "kece",
            "sempurna", "top", "joss", "nendang", "juara", "hits",
        }
        NEGATIVE_WORDS = {
            "jelek", "buruk", "pahit", "asin", "hambar", "lambat", "mahal",
            "kotor", "kecewa", "mengecewakan", "tidak", "basi", "sempit",
            "berantakan", "lama", "zonk", "gagal", "menyesal", "biasa",
        }
        words = set(cleaned_text.split())
        pos_count = len(words & POSITIVE_WORDS)
        neg_count = len(words & NEGATIVE_WORDS)

        if pos_count > neg_count:
            return SentimentResult(label="positif", score=0.7, numeric_score=1.0)
        elif neg_count > pos_count:
            return SentimentResult(label="negatif", score=0.7, numeric_score=0.0)
        else:
            return SentimentResult(label="netral", score=0.6, numeric_score=0.5)

    # ── Prediksi batch ────────────────────────────────────────────────────────
    def predict_batch(self, reviews: list[str]) -> list[SentimentResult]:
        """Prediksi sentimen untuk banyak review sekaligus."""
        return [self.predict(r) for r in reviews]

    # ── Sentiment Score Restoran ──────────────────────────────────────────────
    def compute_restaurant_sentiment_score(self, reviews: list[str]) -> dict:
        """
        Hitung sentiment score agregat untuk satu restoran.

        Returns:
            {
                "sentiment_score": float,  # 0.0–1.0
                "positive_pct": float,
                "neutral_pct": float,
                "negative_pct": float,
                "total_reviews": int,
            }
        """
        if not reviews:
            return {
                "sentiment_score": 0.5,
                "positive_pct": 0.0,
                "neutral_pct": 100.0,
                "negative_pct": 0.0,
                "total_reviews": 0,
            }

        results = self.predict_batch(reviews)
        total = len(results)
        counts = {"positif": 0, "netral": 0, "negatif": 0}
        numeric_total = 0.0

        for r in results:
            counts[r.label] += 1
            numeric_total += r.numeric_score

        sentiment_score = round(numeric_total / total, 4)

        return {
            "sentiment_score": sentiment_score,
            "positive_pct": round(counts["positif"] / total * 100, 1),
            "neutral_pct": round(counts["netral"] / total * 100, 1),
            "negative_pct": round(counts["negatif"] / total * 100, 1),
            "total_reviews": total,
        }

    @property
    def backend(self) -> str:
        return self._backend


# ── Singleton ─────────────────────────────────────────────────────────────────
_sentiment_service: SentimentService | None = None


def get_sentiment_service() -> SentimentService:
    global _sentiment_service
    if _sentiment_service is None:
        _sentiment_service = SentimentService()
    return _sentiment_service
