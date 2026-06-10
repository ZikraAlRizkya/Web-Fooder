"""
text_cleaning.py
================
Utilitas pembersih teks untuk review Bahasa Indonesia.
Mendukung dua mode:
  - clean_text(text, remove_stopwords=False)  → untuk analisis sentimen
  - clean_text(text, remove_stopwords=True)   → untuk keyword extraction

CATATAN: Sastrawi bersifat opsional. Jika tidak tersedia, stemming dilewati.
"""

import re
import html
import string
from typing import List

# ── Stopwords Bahasa Indonesia (versi ringkas, bisa diperluas) ──
STOPWORDS_ID = {
    "yang", "dan", "di", "ke", "dari", "dengan", "untuk", "ini", "itu",
    "adalah", "ada", "saya", "kami", "kita", "anda", "mereka", "dia",
    "juga", "tidak", "bisa", "sudah", "belum", "akan", "pada", "oleh",
    "atau", "karena", "jika", "tapi", "namun", "tetapi", "sangat", "lebih",
    "paling", "sekali", "lagi", "saja", "pun", "ya", "yg", "nya", "nya",
    "si", "pun", "toh", "kok", "lho", "deh", "dong", "nih", "sih",
    "mau", "mau", "hal", "cara", "buat", "waktu", "saat", "setelah",
    "sebelum", "ketika", "sehingga", "agar", "supaya", "maka", "jadi",
    "url", "user",
}

# ── Coba load Sastrawi (opsional) ──
_stemmer = None
try:
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
    _factory = StemmerFactory()
    _stemmer = _factory.create_stemmer()
except ImportError:
    pass  # Sastrawi tidak tersedia, stemming dinonaktifkan


def clean_text(text: str, remove_stopwords: bool = False) -> str:
    """
    Membersihkan teks review Bahasa Indonesia.

    Args:
        text: Teks mentah dari review.
        remove_stopwords: Jika True, hapus stopwords (untuk keyword extraction).

    Returns:
        Teks bersih yang sudah di-lowercase dan dinormalisasi.
    """
    # Pastikan input string
    text = html.unescape(str(text))

    # Hilangkan URL
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)

    # Hilangkan mention dan hashtag
    text = re.sub(r"@\w+", " ", text)
    text = text.replace("#", " ")

    # Hilangkan emoji unicode
    text = re.sub(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002700-\U000027BF"
        "\U000024C2-\U0001F251"
        "]+",
        " ",
        text,
    )

    # Hilangkan karakter encoding rusak
    text = re.sub(r"[ÂâðŸ€™˜¦¥±¤œ]+", " ", text)

    # Pertahankan huruf, angka, dan spasi
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)

    # Lowercase dan rapikan whitespace
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)

    # Tokenisasi
    tokens = text.split()

    # Hapus stopwords jika diminta
    if remove_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS_ID and len(t) > 1]
    else:
        tokens = [t for t in tokens if len(t) > 1]

    # Stemming jika Sastrawi tersedia
    if _stemmer:
        tokens = [_stemmer.stem(t) for t in tokens]

    return " ".join(tokens)


def tokenize(text: str) -> List[str]:
    """Tokenisasi sederhana berdasarkan spasi."""
    return [t for t in text.split() if t]
