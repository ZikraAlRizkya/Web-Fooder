"""
review_service.py
=================
Review Intelligence untuk FooDer:
  - Review Insight (dominan positif/negatif, persentase, keyword)
  - Text Summarization (extractive berbasis TF-IDF)
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

import numpy as np
from services.sentiment_service import (
    SentimentResult,
    get_sentiment_service,
)
from utils.text_cleaning import (
    STOPWORDS_ID,
    clean_text,
    tokenize,
)


#  Data classes 
@dataclass
class ReviewInsight:
    sentiment_score: float
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    total_reviews: int
    top_positive_reviews: list[str]
    top_negative_reviews: list[str]
    dominant_positive_keywords: list[str]
    dominant_negative_keywords: list[str]
    summary_sentence: str
    human_readable_summary: str    


@dataclass
class SummarizationResult:
    summary: str
    representative_reviews: list[str]   # review paling mewakili keseluruhan
    keyword_highlights: list[str]


#  Keyword extraction (TF-IDF sederhana manual) 
def _extract_keywords(texts: list[str], top_n: int = 8) -> list[str]:
    """
    Ekstrak kata kunci penting dari kumpulan teks menggunakan TF-IDF sederhana.
    """
    if not texts:
        return []

    # TF: frekuensi kata per dokumen
    doc_word_counts: list[Counter] = []
    for text in texts:
        cleaned = clean_text(text, remove_stopwords=True)
        words = [w for w in tokenize(cleaned) if len(w) > 2]
        doc_word_counts.append(Counter(words))

    # DF: jumlah dokumen yang mengandung kata
    total_docs = len(texts)
    df: Counter = Counter()
    for counter in doc_word_counts:
        for word in counter:
            df[word] += 1

    # TF-IDF score
    tfidf_scores: Counter = Counter()
    for counter in doc_word_counts:
        total_words = sum(counter.values()) or 1
        for word, freq in counter.items():
            tf = freq / total_words
            idf = np.log((total_docs + 1) / (df[word] + 1)) + 1
            tfidf_scores[word] += tf * idf

    return [word for word, _ in tfidf_scores.most_common(top_n)]


#  Extractive Summarizer 
def _score_sentence(sentence: str, keyword_weights: dict[str, float]) -> float:
    """Skor kalimat berdasarkan bobot keyword."""
    words = tokenize(clean_text(sentence, remove_stopwords=True))
    if not words:
        return 0.0
    score = sum(keyword_weights.get(w, 0) for w in words) / len(words)
    return score


def _extractive_summarize(reviews: list[str], max_sentences: int = 3) -> str:
    """
    Rangkum review dengan memilih kalimat paling representatif.

    Algoritma:
    1. Ekstrak semua kalimat dari semua review
    2. Hitung TF-IDF keyword weight
    3. Skor setiap kalimat
    4. Pilih top-N kalimat
    """
    # Pecah semua review menjadi kalimat
    all_sentences: list[str] = []
    for review in reviews:
        # Pisahkan berdasarkan tanda baca akhir kalimat
        sentences = re.split(r"[.!?]", review)
        for s in sentences:
            s = s.strip()
            if len(s.split()) >= 4:   # minimal 4 kata
                all_sentences.append(s)

    if not all_sentences:
        return "Belum ada review yang cukup untuk dirangkum."

    # Hitung keyword weight dari semua teks review
    keywords = _extract_keywords(reviews, top_n=20)
    keyword_weights = {kw: 1.0 for kw in keywords}

    # Skor tiap kalimat
    scored = [
        (s, _score_sentence(s, keyword_weights))
        for s in all_sentences
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    # Pilih top-N, hindari duplikat yang terlalu mirip
    selected: list[str] = []
    seen_words: set[str] = set()

    for sentence, _ in scored:
        words = set(tokenize(clean_text(sentence)))
        overlap = len(words & seen_words) / (len(words) + 1)
        if overlap < 0.5:   # maksimum 50% overlap
            selected.append(sentence)
            seen_words.update(words)
        if len(selected) >= max_sentences:
            break

    return ". ".join(selected) + "."


#  Review Service 
class ReviewService:
    """
    Layanan analisis review dan summarization.
    """

    def __init__(self):
        self._sentiment_svc = get_sentiment_service()

    #  Review Insight 
    def get_review_insight(
        self,
        reviews: list[str],
        top_n: int = 5,
    ) -> ReviewInsight:
        """
        Analisis lengkap review restoran.

        Args:
            reviews: List string teks review mentah.
            top_n: Jumlah review positif/negatif yang ditampilkan.

        Returns:
            ReviewInsight berisi persentase sentimen, keyword, dan summary.
        """
        if not reviews:
            return self._empty_insight()

        # 1. Prediksi sentimen semua review
        results: list[SentimentResult] = self._sentiment_svc.predict_batch(reviews)

        # 2. Pisahkan review berdasarkan sentimen
        positive_reviews = [
            reviews[i] for i, r in enumerate(results) if r.label == "positif"
        ]
        negative_reviews = [
            reviews[i] for i, r in enumerate(results) if r.label == "negatif"
        ]
        neutral_reviews = [
            reviews[i] for i, r in enumerate(results) if r.label == "netral"
        ]

        total = len(reviews)
        pos_pct = round(len(positive_reviews) / total * 100, 1)
        neu_pct = round(len(neutral_reviews) / total * 100, 1)
        neg_pct = round(len(negative_reviews) / total * 100, 1)

        # 3. Keyword dominan per sentimen
        pos_keywords = _extract_keywords(positive_reviews, top_n=6)
        neg_keywords = _extract_keywords(negative_reviews, top_n=6)

        # 4. Sentiment score numerik
        sentiment_score = round(
            sum(r.numeric_score for r in results) / total, 4
        )

        # 5. Summary kalimat manusia
        human_summary = self._build_human_summary(
            pos_pct, neg_pct, neu_pct, pos_keywords, neg_keywords
        )

        # 6. Ringkasan otomatis
        summary_text = _extractive_summarize(reviews, max_sentences=2)

        return ReviewInsight(
            sentiment_score=sentiment_score,
            positive_pct=pos_pct,
            neutral_pct=neu_pct,
            negative_pct=neg_pct,
            total_reviews=total,
            top_positive_reviews=positive_reviews[:top_n],
            top_negative_reviews=negative_reviews[:top_n],
            dominant_positive_keywords=pos_keywords,
            dominant_negative_keywords=neg_keywords,
            summary_sentence=summary_text,
            human_readable_summary=human_summary,
        )

    def _build_human_summary(
        self,
        pos_pct: float,
        neg_pct: float,
        neu_pct: float,
        pos_keywords: list[str],
        neg_keywords: list[str],
    ) -> str:
        """
        Buat kalimat ringkasan mudah dibaca manusia.
        Contoh: "78% pengguna puas. Banyak yang menyukai rasa dan porsi."
        """
        parts: list[str] = []

        if pos_pct >= 60:
            parts.append(f"{pos_pct:.0f}% pengguna merasa puas")
        elif pos_pct >= 40:
            parts.append(f"Pendapat pengguna cukup beragam ({pos_pct:.0f}% puas)")
        else:
            parts.append(f"Hanya {pos_pct:.0f}% pengguna yang merasa puas")

        if pos_keywords:
            parts.append(
                "Banyak yang menyukai " + ", ".join(pos_keywords[:3])
            )

        if neg_pct >= 20 and neg_keywords:
            parts.append(
                "Beberapa mengeluhkan " + ", ".join(neg_keywords[:2])
            )

        return ". ".join(parts) + "."

    def _empty_insight(self) -> ReviewInsight:
        return ReviewInsight(
            sentiment_score=0.5,
            positive_pct=0.0,
            neutral_pct=100.0,
            negative_pct=0.0,
            total_reviews=0,
            top_positive_reviews=[],
            top_negative_reviews=[],
            dominant_positive_keywords=[],
            dominant_negative_keywords=[],
            summary_sentence="Belum ada review.",
            human_readable_summary="Belum ada review untuk restoran ini.",
        )

    #  Summarization 
    def summarize_reviews(
        self,
        reviews: list[str],
        max_sentences: int = 3,
        top_representatives: int = 3,
    ) -> SummarizationResult:
        """
        Rangkum kumpulan review.

        Args:
            reviews: List teks review.
            max_sentences: Maksimum kalimat dalam ringkasan.
            top_representatives: Jumlah review representatif yang disertakan.

        Returns:
            SummarizationResult dengan ringkasan dan review pilihan.
        """
        if not reviews:
            return SummarizationResult(
                summary="Belum ada review.",
                representative_reviews=[],
                keyword_highlights=[],
            )

        summary = _extractive_summarize(reviews, max_sentences=max_sentences)
        keywords = _extract_keywords(reviews, top_n=8)

        # Pilih review paling representatif (yang mengandung banyak keyword)
        keyword_set = set(keywords)
        scored_reviews = sorted(
            reviews,
            key=lambda r: len(
                set(tokenize(clean_text(r, remove_stopwords=True))) & keyword_set
            ),
            reverse=True,
        )
        representatives = scored_reviews[:top_representatives]

        return SummarizationResult(
            summary=summary,
            representative_reviews=representatives,
            keyword_highlights=keywords,
        )


#  Singleton 
_review_service: ReviewService | None = None


def get_review_service() -> ReviewService:
    global _review_service
    if _review_service is None:
        _review_service = ReviewService()
    return _review_service
