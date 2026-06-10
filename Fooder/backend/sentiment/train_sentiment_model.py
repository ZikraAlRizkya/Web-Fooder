"""
train_sentiment_model.py
========================
Script training model sentimen TF-IDF + Logistic Regression
sebagai FALLBACK apabila IndoBERT tidak tersedia / koneksi lambat.

Jalankan sekali sebelum deploy:
    python train_sentiment_model.py

Output:
    app/models/sentiment_model.pkl
    app/models/tfidf_vectorizer.pkl
"""

import os
import pickle
import sys

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

# Tambahkan root ke path agar bisa import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.text_cleaning import clean_text

# Konfigurasi
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "datasets", "Sentiment Analysis Indonesia.csv")    # dataset sentimen Indonesia
MODEL_DIR = os.path.join(BASE_DIR, "backend", "sentiment", "app", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "sentiment_model.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")

# Kolom dalam CSV 
TEXT_COL = "review"       # nama kolom teks
LABEL_COL = "sentiment"   # nama kolom label: positif / netral / negatif


# Load Data
def load_data() -> pd.DataFrame:
    if os.path.exists(DATA_PATH):
        print(f" Loading dataset dari {DATA_PATH} ...")
        df = pd.read_csv(DATA_PATH)
        # Memastikan kolomnya ada
        if TEXT_COL not in df.columns or LABEL_COL not in df.columns:
            print(
                f"  Kolom '{TEXT_COL}' atau '{LABEL_COL}' tidak ditemukan. "
                "Menggunakan data dummy."
            )
            return pd.DataFrame(DUMMY_DATA)
        df = df[[TEXT_COL, LABEL_COL]].dropna()
        df.columns = ["review", "sentiment"]
        return df
    else:
        print("  Dataset tidak ditemukan. Menggunakan data dummy untuk training.")
        print(f"   Letakkan dataset di: {DATA_PATH}")
        return pd.DataFrame(DUMMY_DATA)


#Preprocessing
def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    print(" Preprocessing teks ...")
    df = df.copy()
    df["cleaned"] = df["review"].apply(
        lambda x: clean_text(str(x), remove_stopwords=True)
    )
    df = df[df["cleaned"].str.strip() != ""]  # hapus baris kosong
    return df


# Training 
def train(df: pd.DataFrame):
    print(f"   Total data: {len(df)} baris")
    print(f"   Distribusi label:\n{df['sentiment'].value_counts()}")

    X = df["cleaned"].values
    y = df["sentiment"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if len(df) >= 10 else None
    )

    print("\n Training TF-IDF + Logistic Regression ...")

    # Pipeline: TF-IDF → Logistic Regression
    pipeline = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                ngram_range=(1, 2),   # unigram + bigram
                max_features=10_000,
                sublinear_tf=True,
            ),
        ),
        (
            "clf",
            LogisticRegression(
                max_iter=500,
                C=1.0,
                class_weight="balanced",
                random_state=42,
            ),
        ),
    ])

    pipeline.fit(X_train, y_train)

    # Evaluasi
    y_pred = pipeline.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    return pipeline


#  Simpan Model 
def save_model(pipeline: Pipeline):
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Pisah vectorizer dan classifier untuk fleksibilitas
    vectorizer = pipeline.named_steps["tfidf"]
    classifier = pipeline.named_steps["clf"]

    with open(VECTORIZER_PATH, "wb") as f:
        pickle.dump(vectorizer, f)
    print(f"Vectorizer disimpan ke: {VECTORIZER_PATH}")

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(classifier, f)
    print(f"Model disimpan ke: {MODEL_PATH}")


#  Main 
if __name__ == "__main__":
    print("=" * 50)
    print("  FooDer — Sentiment Model Training (Fallback)")
    print("=" * 50)

    df = load_data()
    df = preprocess(df)
    pipeline = train(df)
    save_model(pipeline)

    print("\n Training selesai! Model siap digunakan sebagai fallback.")
    print("   IndoBERT tetap diprioritaskan saat runtime jika tersedia.")
