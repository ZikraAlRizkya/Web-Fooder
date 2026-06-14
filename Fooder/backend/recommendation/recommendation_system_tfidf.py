# ============================================================
# RECOMMENDATION SYSTEM — TF-IDF
# Data source : Database (SQLAlchemy) via foods.py model
# ============================================================

# ============================================================
# CELL 1 — IMPORT LIBRARIES
# ============================================================

import re
import warnings

import numpy as np
import pandas as pd

from collections import defaultdict

# ------------------------------------------------------------
# MACHINE LEARNING
# ------------------------------------------------------------

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ------------------------------------------------------------
# DATABASE
# ------------------------------------------------------------

from sqlalchemy.orm import Session
from Fooder.backend.database.models import Food

# ------------------------------------------------------------
# SETTINGS
# ------------------------------------------------------------

warnings.filterwarnings("ignore")

RANDOM_STATE = 42

print("Libraries imported successfully.")

from Fooder.backend.recommendation.preference_keywords import (
    PREFERENCE_EXPANSION
)

# ============================================================
# CELL 2 — TEXT CLEANING ENGINE
# ============================================================

def clean_text(text):
    """
    Universal text cleaning function
    untuk seluruh metadata makanan.
    """

    if pd.isna(text) or text is None:
        return ""

    text = str(text)
    text = text.lower()

    # Remove numbers
    text = re.sub(r"\d+", " ", text)

    # Remove special characters
    text = re.sub(r"[^a-zA-Z\s]", " ", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# ============================================================
# CELL 3 — LOAD FOOD MASTER FROM DATABASE
# ============================================================

def load_food_master_from_db(db: Session) -> pd.DataFrame:
    """
    Membaca seluruh data makanan dari tabel `foods`
    (model Food) dan membangun food_master DataFrame
    yang siap dipakai oleh TF-IDF engine.

    Kolom yang dihasilkan:
        food_id       – id dari database
        food_name     – title_cleaned (sudah lowercase + clean)
        food_text     – gabungan food_name × 3 + ingredients + category
        food_type     – hasil detect_food_type()
        cuisine       – hasil detect_cuisine()
        food_source   – selalu "database"
    """

    print("Loading food master from database...")

    # --------------------------------------------------------
    # QUERY ALL FOODS
    # --------------------------------------------------------

    foods = db.query(Food).all()

    if not foods:
        raise ValueError(
            "Tabel foods kosong. Pastikan database sudah di-seed."
        )

    # --------------------------------------------------------
    # BUILD RAW DATAFRAME
    # --------------------------------------------------------

    rows = []

    for food in foods:
        rows.append({
            "food_id":    food.id,
            "raw_name":   food.title_cleaned   or "",
            "raw_ingr":   food.ingredients_cleaned or "",
            "raw_cat":    food.category        or "",
            "raw_country": food.origin_country or "",
        })

    df = pd.DataFrame(rows)

    # --------------------------------------------------------
    # CLEAN TEXT FIELDS
    # --------------------------------------------------------

    df["food_name"] = df["raw_name"].apply(clean_text)
    df["ingredients_clean"] = df["raw_ingr"].apply(clean_text)
    df["category_clean"] = df["raw_cat"].apply(clean_text)
    df["origin_country"] = df["raw_country"].apply(clean_text)

    # --------------------------------------------------------
    # BUILD food_text
    # Nama diulang 3× agar bobotnya lebih tinggi di TF-IDF
    # --------------------------------------------------------
    # BUILD BASE food_text
    df["food_text"] = (
        df["food_name"] + " " +
        df["food_name"] + " " +
        df["food_name"] + " " +
        df["ingredients_clean"] + " " +
        df["category_clean"]
    )

    # DETECT TAGS
    df["food_type"] = df["food_text"].apply(detect_food_type)
    df["cuisine"]   = df["food_text"].apply(detect_cuisine)
    df["taste_mood"] = df["food_text"].apply(detect_taste_mood)
    df["requirement"] = df["food_text"].apply(detect_requirement)
   
    # BERSIHKAN TAG
    df["food_type"] = df["food_type"].replace("other", "")
    df["cuisine"]   = df["cuisine"].replace("other", "")

    # BUILD FINAL food_text
    df["food_text"] = (
        df["food_text"] + " " +
        df["taste_mood"].fillna("") + " " +
        df["food_type"].fillna("")

    )

    # --------------------------------------------------------
    # REMOVE EMPTY / DUPLICATE NAMES
    # --------------------------------------------------------

    df = df[df["food_name"] != ""]
    df = df.drop_duplicates(subset=["food_name"]).reset_index(drop=True)

    # --------------------------------------------------------
    # EXTRA FEATURES
    # --------------------------------------------------------

    df["food_type"] = df["food_text"].apply(detect_food_type)
    df["taste_mood"] = df["food_text"].apply(detect_taste_mood)

    df["food_source"] = "database"

    # --------------------------------------------------------
    # FINAL COLUMNS
    # --------------------------------------------------------

    food_master = df[[
        "food_id",
        "food_name",
        "food_text",
        "food_type",
        "cuisine",
        "taste_mood",
        "requirement",
        "food_source",
        "origin_country"
    ]].copy()
    
    print("\nFOOD_MASTER COLUMNS:")
    print(df.columns.tolist())
    
    return food_master


# ============================================================
# CELL 4 — TF-IDF ENGINE BUILDER
# ============================================================

def build_tfidf_engine(food_master: pd.DataFrame):
    """
    Membangun TF-IDF vectorizer dan matrix
    dari food_master yang sudah dimuat.

    Returns:
        tfidf        – fitted TfidfVectorizer
        tfidf_matrix – sparse matrix (n_foods × n_features)
    """

    print("Building TF-IDF matrix...")

    tfidf = TfidfVectorizer(
        max_features=5000,
        stop_words="english",
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.95,
    )

    tfidf_matrix = tfidf.fit_transform(food_master["food_text"])

    print(f"TF-IDF Matrix Shape : {tfidf_matrix.shape}")
    print(f"Vocabulary Size     : {len(tfidf.get_feature_names_out())}")

    return tfidf, tfidf_matrix


# ============================================================
# CELL 5 — FOOD TYPE & CUISINE DETECTION
# ============================================================

def detect_taste_mood(food_text: str) -> str:
    food_text = str(food_text).lower()

    spicy_keywords = [
        "pedas", "sambal", "balado",
        "rica", "rawit", "cabai",
        "cabe", "mercon", "geprek", "pedes"
    ]

    sweet_keywords = [
        "manis", "gula", "madu",
        "karamel", "sweet",
        "coklat", "sirup"
    ]

    savory_keywords = [
        "gurih", "kaldu", "bawang",
        "saos tiram", "kecap asin",
        "mentega", "garlic"
    ]

    comfort_keywords = [
        "bakso", "soto", "sup",
        "mie ayam", "nasi goreng",
        "opor", "rawon", "gulai",
        "tongseng", "ayam goreng"
    ]

    healthy_keywords = [
        "salad", "sayur", "brokoli",
        "bayam", "wortel",
        "kukus", "rebus",
        "buah", "vegetable"
    ]

    if any(k in food_text for k in spicy_keywords):
        return "pedas sambal cabe"

    if any(k in food_text for k in savory_keywords):
        return "gurih bawang kaldu"

    if any(k in food_text for k in comfort_keywords):
        return "bakso gulai soto"

    if any(k in food_text for k in healthy_keywords):
        return "salad sayur buah"
    
    if any(k in food_text for k in sweet_keywords):
        return "manis gula coklat"

    return None

def detect_food_type(food_text: str) -> str:
    food_text = str(food_text).lower()

    rice_keywords = [
        "rice", "nasi", "biryani", "fried rice",
        "nasi goreng", "nasi uduk", "nasi kuning",
        "nasi liwet", "nasi bakar", "nasi tim"
    ]

    noodle_keywords = [
        "noodle", "noodles", "ramen", "udon",
        "mie", "kwetiau", "bihun",
        "spaghetti", "fettuccine", "linguine",
        "macaroni", "penne", "fusili", "fusilli", "kwetiau", "soun"
    ]

    chicken_keywords = [
        "ayam", "chicken",
        "karaage", "katsu",
        "drumstick"
    ]
    
    seafood_keywords = [
        "udang", "ikan",
        "cumi", "kepiting",
        "kerang", "tuna",
        "salmon"
    ]
    
    dessert_keywords = [
        "cake", "cookie", "dessert", "ice cream",
        "pudding", "puding", "brownies", "donut", "doughnut",
        "pie", "tart", "muffin", "waffle",
        "pancake", "cheesecake", "es krim", "kolak", "kue",
        "donat",
    ]

    snack_keywords = [
        "snack", "chips", "keripik",
        "cracker", "popcorn", "nachos",
        "risoles", "pastel", "gorengan",
        "cireng", "cilok", "cimol",
        "dimsum", "siomay", "perkedel", "risoles",
        "pastel"
    ]

    if any(k in food_text for k in rice_keywords):
        return "rice nasi"

    if any(k in food_text for k in noodle_keywords):
        return "mie ramen kwetiau"

    if any(k in food_text for k in chicken_keywords):
        return "ayam chicken katsu"

    if any(k in food_text for k in seafood_keywords):
        return "udang cumi ikan"
    
    if any(k in food_text for k in dessert_keywords):
        return "cheesecake pie panekuk"

    if any(k in food_text for k in snack_keywords):
        return "risoles cireng dimsum"

    return None


def detect_cuisine(food_text: str) -> str:
    food_text = str(food_text).lower()

    indonesian_keywords = [
        "sambal", "rendang", "nasi",
        "gado gado", "gado-gado",
        "soto", "rawon", "pempek",
        "bakso", "pecel", "lontong",
        "opor", "gulai", "ayam goreng",
        "mie ayam", "mie goreng",
        "tongseng", "sate", "satay",
        "martabak", "nasi goreng",
        "ayam bakar", "ikan bakar"
    ]

    korean_keywords = [
        "kimchi",
        "bibimbap", "bulgogi",
        "korean", "dakgalbi"
    ]

    japanese_keywords = [
        "sushi", "ramen", "udon",
        "tempura", "teriyaki",
        "katsu", "donburi",
        "yakitori", "gyudon",
        "japanese", "miso",
        "onigiri", "takoyaki"
    ]

    western_keywords = [
        "burger", "steak",
        "western", "sandwich",
        "hotdog", "roast beef",
        "bbq", "barbecue",
        "mashed potato",
        "fried chicken"
    ]

    chinese_keywords = [
        "capcay", "kwetiau",
        "bakmi", "fuyunghai",
        "dimsum", "hakau",
        "sapo tahu", "kungpao"
    ]

    if any(k in food_text for k in indonesian_keywords):
        return "indonesian"

    if any(k in food_text for k in korean_keywords):
        return "korean"

    if any(k in food_text for k in japanese_keywords):
        return "japanese"

    if any(k in food_text for k in western_keywords):
        return "western"

    if any(k in food_text for k in chinese_keywords):
        return "chinese"

    return None

def detect_requirement(food_text: str) -> str:
    food_text = str(food_text).lower()

    protein_keywords = [
        "ayam", "daging",
        "sapi", "telur",
        "udang", "ikan",
        "tuna", "salmon",
        "tempe"
    ]
    
    vegetarian_keywords = [
        "tempe", "tahu",
        "brokoli", "bayam",
        "wortel", "jamur"
    ]

    low_calorie_keywords = [
        "salad", "sayur",
        "rebus", "kukus",
        "buah", "brokoli"
    ]

    if any(k in food_text for k in protein_keywords):
        return "ayam daging telur"

    # Vegetarian hanya jika tidak ada protein hewani
    if any(k in food_text for k in vegetarian_keywords):
        return "tahu tempe"

    if any(k in food_text for k in low_calorie_keywords):
        return "low_calorie"

    return None
#==============================================
# CELL 6 — FOOD ATTRIBUTE EXTRACTION
# ============================================================

ATTRIBUTE_KEYWORDS = {
    # Taste
    "sweet":   ["sweet", "honey", "sugar", "cake", "cookie", "dessert"],
    "savory":  ["savory", "beef", "chicken", "garlic", "onion"],
    "spicy":   ["spicy", "chili", "pepper", "sambal"],
    "cheesy":  ["cheese", "cream", "butter"],
    "fresh":   ["salad", "fruit", "vegetable", "fresh"],
    # Protein
    "beef":    ["beef"],
    "chicken": ["chicken"],
    "seafood": ["fish", "shrimp", "crab", "lobster", "squid"],
    # Food type
    "rice":    ["rice", "nasi"],
    "noodles": ["noodle", "ramen", "udon", "mie"],
    "dessert": ["dessert", "cake", "cookie", "ice cream"],
    "drink":   ["coffee", "tea", "juice", "drink"],
    "snack":   ["snack", "chips"],
    # Cuisine
    "indonesian": ["rendang", "sambal", "nasi"],
    "korean":     ["kimchi", "tteokbokki", "korean"],
    "japanese":   ["sushi", "ramen", "japanese"],
    "western":    ["burger", "steak", "western"],
    "italian":    ["pizza", "pasta", "italian"],
}


def extract_food_attributes(food_text: str) -> list:
    food_text = str(food_text).lower()
    attributes = []

    for attribute, keywords in ATTRIBUTE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in food_text:
                attributes.append(attribute)
                break

    return attributes


# ============================================================
# CELL 7 — USER SESSION MODEL
# ============================================================

class UserSession:
    """
    Menyimpan seluruh preferensi user
    selama satu sesi penggunaan FooDer.
    """

    def __init__(self):
        # Swipe history
        self.liked_foods    = []
        self.disliked_foods = []

        # Food requirements
        self.selected_requirements = []  # e.g. ["Halal", "Vegetarian"]

        # UI preferences
        self.selected_moods      = []    # e.g. ["Sweet", "Fresh"]
        self.selected_food_types = []    # e.g. ["Rice"]
        self.selected_cuisines   = []    # e.g. ["Japanese"]

        self.allergies   = []
        
        # Session profile
        self.today_taste_profile = {}

    def add_like(self, food_id: int):
        if food_id not in self.liked_foods:
            self.liked_foods.append(food_id)

    def add_dislike(self, food_id: int):
        if food_id not in self.disliked_foods:
            self.disliked_foods.append(food_id)

    def summary(self) -> dict:
        return {
            "liked_foods":    len(self.liked_foods),
            "disliked_foods": len(self.disliked_foods),
            "moods":          self.selected_moods,
            "food_types":     self.selected_food_types,
            "cuisines":       self.selected_cuisines,
            "requirements":   self.selected_requirements,
        }


# ============================================================
# CELL 8 — SESSION QUERY BUILDER
# ============================================================

def build_session_query(
    user_session: UserSession,
    food_master: pd.DataFrame,
) -> str:

    query_parts = []

    # ==========================================
    # USER PREFERENCES
    # ==========================================

    # Taste Mood
    for mood in user_session.selected_moods:

        query_parts.extend(
            PREFERENCE_EXPANSION.get(
                mood,
                [mood]
            )
        )

    # Food Type (paling penting)
    for food_type in user_session.selected_food_types:

        query_parts.extend(
            PREFERENCE_EXPANSION.get(
                food_type,
                [food_type]
            ) * 2
        )

    # Cuisine
    for cuisine in user_session.selected_cuisines:

        query_parts.extend(
            PREFERENCE_EXPANSION.get(
                cuisine,
                [cuisine]
            )
        )

    # Requirement
    for req in user_session.selected_requirements:

        query_parts.extend(
            PREFERENCE_EXPANSION.get(
                req,
                [req]
            )
        )

    print("\nEXPANDED QUERY:")

    for item in query_parts:
        print(item)

    # ==========================================
    # LEARNING FROM LIKED FOODS
    # ==========================================

    if user_session.liked_foods:

        liked_rows = food_master[
            food_master["food_id"].isin(
                user_session.liked_foods
            )
        ]

        print("\nLIKED FOODS:")
        print(
            liked_rows[
                [
                    "food_name",
                    "food_type",
                    "cuisine",
                    "taste_mood",
                    "requirement"
                ]
            ]
        )

        for _, row in liked_rows.iterrows():
            
            if row["food_name"]:
                query_parts.extend(
                    [row["food_name"]] * 3
                )
            
            if row["food_type"]:
                query_parts.extend(
                    [row["food_type"]] * 4
                )

            if row["taste_mood"]:
                query_parts.extend(
                    [row["taste_mood"]] * 3
                )


    session_query = " ".join(query_parts)

    print("\nSESSION QUERY:")
    print(session_query)

    return session_query


# ============================================================
# CELL 9 — USER PREFERENCE VECTOR
# ============================================================

def build_user_vector(
    user_session: UserSession,
    food_master: pd.DataFrame,
    tfidf,
):
    """
    Mengubah session query menjadi TF-IDF vector user.
    """

    session_query = build_session_query(
        user_session,
        food_master
    )

    print("\n" + "="*70)
    print("SESSION QUERY")
    print("="*70)
    print(session_query[:500])  # tampilkan 500 karakter pertama
    print("="*70)

    if not session_query:
        return None

    print("BUILD USER VECTOR")
    print("LIKED FOODS:", user_session.liked_foods)

    return tfidf.transform([session_query])


# ============================================================
# CELL 10 — CANDIDATE RETRIEVAL ENGINE
# ============================================================

def retrieve_candidates(
    user_session: UserSession,
    food_master: pd.DataFrame,
    tfidf,
    tfidf_matrix,
    top_k: int = 50,
) -> pd.DataFrame:

    user_vector = build_user_vector(
        user_session,
        food_master,
        tfidf
    )

    if user_vector is None:
        return pd.DataFrame()

    dislike_scores = np.zeros(len(food_master))

    similarity_scores = (
        cosine_similarity(
            user_vector,
            tfidf_matrix
        )
        .flatten()
    )

    # ==========================================
    # DISLIKE VECTOR
    # ==========================================
    if user_session.disliked_foods:

        disliked_rows = food_master[
            food_master["food_id"].isin(
                user_session.disliked_foods
            )
        ]

        if not disliked_rows.empty:

            dislike_text = " ".join(
                disliked_rows["food_text"].tolist()
            )

            dislike_vector = tfidf.transform(
                [dislike_text]
            )

            dislike_scores = (
                cosine_similarity(
                    dislike_vector,
                    tfidf_matrix
                )
                .flatten()
            )

    # ==========================================
    # BUILD FULL CANDIDATES FIRST
    # ==========================================
    candidates = food_master.copy()

    candidates["similarity_score"] = similarity_scores
    candidates["dislike_score"] = dislike_scores

    candidates["final_score"] = (
        candidates["similarity_score"]
        - 0.5 * candidates["dislike_score"]
    )

    # ==========================================
    # REMOVE SWIPED FOODS
    # ==========================================
    excluded = (
        set(user_session.liked_foods)
        | set(user_session.disliked_foods)
    )

    candidates = candidates[
        ~candidates["food_id"].isin(excluded)
    ]

    # ==========================================
    # ALLERGY FILTER
    # ==========================================

    print("\n===== ALLERGY DEBUG =====")
    print("ALLERGIES:", user_session.allergies)
    print("TOTAL CANDIDATES BEFORE:", len(candidates))

    if user_session.allergies:

        for allergy in user_session.allergies:

            print(f"\nFiltering allergy: {allergy}")

            matched = candidates[
                candidates["food_text"]
                .str.contains(
                    allergy,
                    case=False,
                    na=False,
                    regex=False
                )
            ]

            print("FOUND:", len(matched))

            if not matched.empty:
                print(
                    matched[
                        ["food_name", "food_text"]
                    ].head(10)
                )

            candidates = candidates[
                ~candidates["food_text"]
                .str.contains(
                    allergy,
                    case=False,
                    na=False,
                    regex=False
                )
            ]

    print("TOTAL CANDIDATES AFTER:", len(candidates))
    print("=========================\n")
    
    # ==========================================
    # HARD FILTER CUISINE
    # ==========================================
    if user_session.selected_cuisines:

        selected_cuisine = (
            user_session.selected_cuisines[0]
            .lower()
        )

        cuisine_candidates = candidates[
            candidates["origin_country"]
            .fillna("")
            .str.lower()
            == selected_cuisine
        ]

        print(
            "\nAVAILABLE COUNTRIES:"
        )

        print(
            candidates["origin_country"]
            .value_counts()
        )

        print(
            "SELECTED:",
            selected_cuisine
        )

        print(
            "FOUND:",
            len(cuisine_candidates)
        )

        # Pakai filter jika masih ada kandidat
        if len(cuisine_candidates) > 0:

            print(
                f"[CUISINE FILTER] "
                f"{selected_cuisine}"
            )

            candidates = cuisine_candidates

        else:

            print(
                "[CUISINE FILTER] "
                "Fallback all countries"
            )

    # ==========================================
    # REQUIREMENT FILTER
    # ==========================================
    '''if "Vegetarian" in user_session.selected_requirements:

        candidates = candidates[
            candidates["requirement"]
            == "vegetarian"
        ]

    if "High Protein" in user_session.selected_requirements:

        candidates = candidates[
            candidates["requirement"]
            == "high_protein"
        ]'''

    # ==========================================
    # DEBUG
    # ==========================================
    print("\n" + "=" * 70)
    print("RETRIEVE CANDIDATES")
    print("=" * 70)

    print("LIKED:", user_session.liked_foods)
    print("DISLIKED:", user_session.disliked_foods)

    top_preview = (
        candidates
        .sort_values(
            by="final_score",
            ascending=False
        )
        .head(10)
    )

    print("\nTOP 10 FINAL RANKING")

    for _, row in top_preview.iterrows():

        print(
            f"- {row['food_name']} | "
            f"country={row['origin_country']} | "
            f"sim={row['similarity_score']:.4f} | "
            f"final={row['final_score']:.4f}"
        )

    print("=" * 70)

    return (
        candidates
        .sort_values(
            by="final_score",
            ascending=False
        )
        .head(top_k)
        .reset_index(drop=True)
    )


# ============================================================
# CELL 11 — TODAY'S TASTE PROFILE
# ============================================================

def build_today_taste_profile(
    user_session: UserSession,
    food_master:  pd.DataFrame,
) -> dict:
    """
    Membangun profil selera harian berdasarkan
    makanan yang di-like selama sesi berlangsung.
    """

    profile = defaultdict(float)

    if not user_session.liked_foods:
        return {}

    liked_rows = food_master[
        food_master["food_id"].isin(user_session.liked_foods)
    ]

    print("\nLIKED IDS:")
    print(user_session.liked_foods)

    print("\nLIKED ROWS FOUND:")
    print(len(liked_rows))

    if not liked_rows.empty:
        print(
            liked_rows[
                ["food_id", "food_name"]
            ].to_string()
        )
    
    for _, row in liked_rows.iterrows():
        for attribute in extract_food_attributes(row["food_text"]):
            profile[attribute] += 1

    if not profile:
        return {}

    max_score = max(profile.values())
    return {k: v / max_score for k, v in profile.items()}


# ============================================================
# CELL 12 — UI PREFERENCE PROFILE
# ============================================================

MOOD_MAPPING = {
    "spicy":  ["spicy"],
    "sweet":  ["sweet"],
    "savory": ["savory"],
    "cheesy": ["cheesy"],
    "fresh":  ["fresh"],
}

FOOD_TYPE_MAPPING = {
    "rice":    ["rice"],
    "noodles": ["noodles"],
    "snack":   ["snack"],
    "dessert": ["dessert"],
    "drink":   ["drink"],
}

CUISINE_MAPPING = {
    "indonesian": ["indonesian"],
    "korean":     ["korean"],
    "japanese":   ["japanese"],
    "western":    ["western"],
    "italian":    ["italian"],
}


def build_ui_preference_profile(user_session: UserSession) -> dict:
    profile = defaultdict(float)

    for mood in user_session.selected_moods:
        for attr in MOOD_MAPPING.get(mood.lower(), []):
            profile[attr] += 1

    for food_type in user_session.selected_food_types:
        for attr in FOOD_TYPE_MAPPING.get(food_type.lower(), []):
            profile[attr] += 1

    for cuisine in user_session.selected_cuisines:
        for attr in CUISINE_MAPPING.get(cuisine.lower(), []):
            profile[attr] += 1

    return dict(profile)


# ============================================================
# CELL 13 — FOOD REQUIREMENT FILTER
# ============================================================

def apply_food_requirement_filter(
    candidates:   pd.DataFrame,
    user_session: UserSession,
) -> pd.DataFrame:

    filtered     = candidates.copy()
    requirements = [r.lower() for r in user_session.selected_requirements]

    if "halal" in requirements:
        haram = ["pork", "ham", "bacon", "wine", "beer"]
        mask  = ~filtered["food_text"].str.contains(
            "|".join(haram), case=False, na=False
        )
        filtered = filtered[mask]

    if "vegetarian" in requirements:
        meat = ["beef", "chicken", "pork", "fish", "shrimp", "crab", "lobster", "squid"]
        mask = ~filtered["food_text"].str.contains(
            "|".join(meat), case=False, na=False
        )
        filtered = filtered[mask]

    if "no seafood" in requirements:
        seafood = ["fish", "shrimp", "crab", "lobster", "squid"]
        mask    = ~filtered["food_text"].str.contains(
            "|".join(seafood), case=False, na=False
        )
        filtered = filtered[mask]

    return filtered.reset_index(drop=True)


# ============================================================
# CELL 14 — SHOW MY RECOMMENDATIONS
# ============================================================

def show_my_recommendations(
    candidates: pd.DataFrame,
    user_session: UserSession,
    food_master: pd.DataFrame,
    top_n: int = 10,
) -> pd.DataFrame:
    recommendations = candidates.copy()
    ui_profile = build_ui_preference_profile(
        user_session
    )
    taste_profile = build_today_taste_profile(
        user_session,
        food_master
    )
    taste_scores = []
    for _, row in recommendations.iterrows():
        attributes = extract_food_attributes(
            row["food_text"]
        )
        score = 0
        for attr in attributes:
            score += taste_profile.get(attr, 0)
            score += ui_profile.get(attr, 0)
        taste_scores.append(score)
    # simpan dulu
    recommendations["taste_score"] = taste_scores
    # normalisasi
    max_taste = max(
        recommendations["taste_score"].max(),
        1
    )
    recommendations["taste_score_norm"] = (
        recommendations["taste_score"]
        / max_taste
    )
    # ranking akhir
    recommendations["ranking_score"] = (
        recommendations["final_score"] * 0.85
        + recommendations["taste_score_norm"] * 0.15
    )
    return (
        recommendations
        .sort_values(
            by="ranking_score",
            ascending=False
        )
        .head(top_n)
        .reset_index(drop=True)
    )
# ============================================================
# CELL 15 — PUBLIC API (dipakai oleh app.py)
# ============================================================

def get_top_recommendations(
    user_session: UserSession,
    food_master:  pd.DataFrame,
    tfidf,
    tfidf_matrix,
    top_n: int = 10,
) -> list[dict]:
    """
    Fungsi utama yang dipanggil dari app.py.
    Mengembalikan list rekomendasi makanan dalam format dict.
    """
    # Ambil kandidat berdasarkan cosine similarity
    candidates = retrieve_candidates(
        user_session, food_master, tfidf, tfidf_matrix, top_k=50
    )
    if candidates.empty:
        return []
    # Filter requirement (halal, vegetarian, dll.)
    filtered = apply_food_requirement_filter(candidates, user_session)
    if filtered.empty:
        filtered = candidates  # fallback jika semua tersaring
    # Ranking akhir
    recommendations = show_my_recommendations(
        filtered, user_session, food_master, top_n=top_n
    )
    print("="*50)
    print("GET_TOP_RECOMMENDATIONS CALLED")
    print("LIKED:", user_session.liked_foods)
    print("="*50)
    return recommendations[[
        "food_id",
        "food_name",
        "food_type",
        "cuisine",
        "taste_mood",
        "similarity_score",
        "taste_score",
        "final_score",
    ]].to_dict(orient="records")
def decide_match(
    food_id:      int,
    action:       str,           # "like" | "dislike"
    user_session: UserSession,
    food_master:  pd.DataFrame,
) -> dict:
    """
    Mencatat aksi swipe user (like/dislike)
    dan memperbarui taste profile.
    """

    if action == "like":
        user_session.add_like(food_id)
    else:
        user_session.add_dislike(food_id)

    # Update taste profile setelah setiap swipe
    user_session.today_taste_profile = build_today_taste_profile(
        user_session, food_master
    )

    return {
        "food_id": food_id,
        "action":  action,
        "session": user_session.summary(),
    }
    
def get_liked_foods_scores(
    user_session: UserSession,
    food_master: pd.DataFrame,
    tfidf,
    tfidf_matrix,
) -> list[dict]:
    """
    Menghitung final_score untuk makanan yang sudah di-like,
    digunakan khusus untuk Force Match logic.
    """
    if not user_session.liked_foods:
        return []

    user_vector = build_user_vector(user_session, food_master, tfidf)
    if user_vector is None:
        return []

    liked_rows = food_master[
        food_master["food_id"].isin(user_session.liked_foods)
    ].copy()

    if liked_rows.empty:
        return []

    # Hitung similarity score untuk liked foods saja
    liked_indices = liked_rows.index.tolist()
    liked_matrix = tfidf_matrix[liked_indices]

    similarity_scores = (
        cosine_similarity(user_vector, liked_matrix).flatten()
    )

    liked_rows = liked_rows.reset_index(drop=True)
    liked_rows["similarity_score"] = similarity_scores
    liked_rows["final_score"] = similarity_scores  # tidak ada dislike penalty

    return liked_rows[[
        "food_id", "food_name", "final_score", "similarity_score"
    ]].to_dict(orient="records")