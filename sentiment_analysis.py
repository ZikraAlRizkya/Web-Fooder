import re
import html
import string
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import os

from Sastrawi.Stemmer.StemmerFactory import StemmerFactory

# Inisialisasi stemmer Sastrawi
factory = StemmerFactory()
stemmer = factory.create_stemmer()


# ─────────────────────────────────────────────
# 1. PREPROCESSING
# ─────────────────────────────────────────────

def clean_text(text):
    text = html.unescape(str(text))
    text = re.sub(r"https?://\S+|www\.\S+", " url ", text)
    text = re.sub(r"@\w+", " user ", text)
    text = text.replace("#", " ")
    text = re.sub(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002700-\U000027BF"
        "\U000024C2-\U0001F251"
        "]+",
        " ", text,
    )
    text = re.sub(
        r"(:\s?\)|:-\)|:\s?D|:-D|=\)|=\(|:\(|:-\(|:v|:V|XD|xD|T_T|\^\^|"
        r"--|..|:'\(|:\*|;\)|;-D)",
        " ", text, flags=re.IGNORECASE,
    )
    text = re.sub(r"[ÂâðŸ€™˜¦¥±¤œ]+", " ", text)
    text = re.sub(r"[^a-zA-Z0-9@#.,!?;:()\"' ]", " ", text)
    text = re.sub(r"([!?.,])\1+", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.lower()
    tokens = text.split()
    stopwords = {"url", "user"}
    tokens = [t for t in tokens if t not in stopwords]
    stemmed_tokens = [stemmer.stem(t) for t in tokens]
    return " ".join(stemmed_tokens)


# ─────────────────────────────────────────────
# 2. LOAD & PREPARE DATASET
# ─────────────────────────────────────────────

def load_dataset(filepath: str) -> pd.DataFrame:
    """
    Membaca dataset sentimen Indonesia.
    Mendukung format CSV (.csv) maupun file XLS yang isinya CSV (.xls).
    """
    try:
        df = pd.read_csv(filepath)
    except Exception:
        df = pd.read_excel(filepath)

    # Validasi kolom wajib
    assert "text" in df.columns and "label" in df.columns, \
        "Dataset harus memiliki kolom 'text' dan 'label'."

    df = df.dropna(subset=["text", "label"])
    df["text"] = df["text"].astype(str)
    df["label"] = df["label"].str.strip().str.lower()

    print(f"[INFO] Dataset dimuat: {len(df)} baris")
    print(f"[INFO] Distribusi label:\n{df['label'].value_counts()}\n")
    return df


# ─────────────────────────────────────────────
# 3. TRAINING
# ─────────────────────────────────────────────

def train_model(df: pd.DataFrame, model_dir: str = "models"):
    """
    Melatih model TF-IDF + Logistic Regression.
    Menyimpan vectorizer dan model ke folder models/.
    """
    print("[INFO] Memulai preprocessing teks...")
    df["clean_text"] = df["text"].apply(clean_text)

    X = df["clean_text"]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"[INFO] Train: {len(X_train)} | Test: {len(X_test)}")

    # TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=30000,
        min_df=2,
        sublinear_tf=True,
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec  = vectorizer.transform(X_test)

    # Model
    model = LogisticRegression(
        max_iter=1000,
        C=1.0,
        solver="lbfgs",
        multi_class="auto",
        random_state=42,
    )
    model.fit(X_train_vec, y_train)

    # Evaluasi
    y_pred = model.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)

    print(f"\n[HASIL] Akurasi: {acc:.4f}")
    print("\n[HASIL] Classification Report:")
    print(classification_report(y_test, y_pred))
    print("[HASIL] Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Simpan model
    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(vectorizer, os.path.join(model_dir, "tfidf_vectorizer.pkl"))
    joblib.dump(model,      os.path.join(model_dir, "sentiment_model.pkl"))
    print(f"\n[INFO] Model disimpan di folder '{model_dir}/'")

    return vectorizer, model


# ─────────────────────────────────────────────
# 4. PREDIKSI TEKS BARU
# ─────────────────────────────────────────────

def predict_sentiment(text: str, vectorizer, model) -> dict:
    """
    Memprediksi sentimen untuk satu teks.
    Mengembalikan dict berisi label dan probabilitas.
    """
    cleaned = clean_text(text)
    vec = vectorizer.transform([cleaned])
    label = model.predict(vec)[0]
    proba = model.predict_proba(vec)[0]
    classes = model.classes_

    return {
        "text_asli": text,
        "text_bersih": cleaned,
        "sentimen": label,
        "probabilitas": {cls: round(float(p), 4) for cls, p in zip(classes, proba)},
    }


def load_model(model_dir: str = "models"):
    """Memuat model dan vectorizer yang sudah disimpan."""
    vectorizer = joblib.load(os.path.join(model_dir, "tfidf_vectorizer.pkl"))
    model      = joblib.load(os.path.join(model_dir, "sentiment_model.pkl"))
    print("[INFO] Model berhasil dimuat.")
    return vectorizer, model


# ─────────────────────────────────────────────
# 5. MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    DATASET_PATH = "data/Sentiment_Analysis_Indonesia.csv"

    # --- Training ---
    df = load_dataset(DATASET_PATH)
    vectorizer, model = train_model(df)

    # --- Contoh prediksi ---
    contoh_teks = [
        "Makanan di sini enak banget, pelayanannya ramah!",
        "Kecewa banget, pesanan salah dan lama sekali.",
        "Biasa aja sih, tidak ada yang istimewa.",
    ]

    print("\n[DEMO] Prediksi sentimen:")
    print("-" * 50)
    for teks in contoh_teks:
        hasil = predict_sentiment(teks, vectorizer, model)
        print(f"Teks     : {hasil['text_asli']}")
        print(f"Sentimen : {hasil['sentimen']}")
        print(f"Proba    : {hasil['probabilitas']}")
        print("-" * 50)
