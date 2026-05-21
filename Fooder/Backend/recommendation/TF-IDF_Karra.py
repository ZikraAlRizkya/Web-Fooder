# ============================================================
# FOODER - FINAL END TO END RECOMMENDATION PIPELINE
# ============================================================
# Features:
# ✅ TF-IDF Recommendation
# ✅ Cosine Similarity
# ✅ Bayesian Rating
# ✅ Bilingual Search
# ✅ Indonesian Food Enhancement
# ✅ Swipe Learning System
# ✅ Fuzzy Search
# ✅ Recommendation Explanation
# ✅ Preference Weighting
# ✅ Smart Food Category
# ✅ Recommendation History
# ✅ Adaptive Recommendation
# ============================================================

print("=" * 60)
print("🔥 FOODER FINAL RECOMMENDATION SYSTEM")
print("=" * 60)

# ============================================================
# IMPORT LIBRARIES
# ============================================================

import pandas as pd
import numpy as np
import re
import warnings
import sys
import subprocess

from pathlib import Path
from collections import defaultdict

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

warnings.filterwarnings("ignore")

# ============================================================
# INSTALL RAPIDFUZZ
# ============================================================

try:

    from rapidfuzz import fuzz, process

except ImportError:

    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "rapidfuzz"]
    )

    from rapidfuzz import fuzz, process

print("✅ Libraries Loaded")

# ============================================================
# DATASET PATH
# ============================================================

NOTEBOOK_DIR = Path().resolve()

DATASET_DIR = NOTEBOOK_DIR.parent.parent / 'Dataset'

PATHS = {

    'raw_recipes':
        DATASET_DIR / 'RAW_recipes.csv',

    'raw_interactions':
        DATASET_DIR / 'RAW_interactions.csv',

    'train_json':
        DATASET_DIR / 'train.json',

    'indo_recipes':
        DATASET_DIR / 'Indonesian_Food_Recipes.csv'
}

# ============================================================
# VERIFY DATASET
# ============================================================

print("\n📂 Dataset Verification:")

for name, path in PATHS.items():

    exists = "✅ FOUND" if path.exists() else "❌ NOT FOUND"

    print(f"{exists} - {name}")

# ============================================================
# LOAD DATASETS
# ============================================================

print("\n📥 Loading datasets...")

df_recipes = pd.read_csv(
    PATHS['raw_recipes']
)

df_interactions = pd.read_csv(
    PATHS['raw_interactions']
)

df_ingredients = pd.read_json(
    PATHS['train_json']
)

df_indo = pd.read_csv(
    PATHS['indo_recipes']
)

# ============================================================
# SAFE RENAME
# ============================================================

df_recipes = df_recipes.rename(columns={
    'id': 'recipe_id'
})

# ============================================================
# MEMORY SAFE SAMPLE
# ============================================================

df_recipes = df_recipes.sample(
    20000,
    random_state=42
).reset_index(drop=True)

print(f"\n✅ Dataset Sampled: {df_recipes.shape}")

# ============================================================
# CLEANING FUNCTION
# ============================================================

def clean_text(text):

    if isinstance(text, list):

        text = " ".join(text)

    text = str(text).lower()

    text = re.sub(
        r'[^a-zA-Z\s]',
        ' ',
        text
    )

    text = re.sub(
        r'\s+',
        ' ',
        text
    ).strip()

    return text

# ============================================================
# CLEAN MAIN DATASET
# ============================================================

print("\n🧹 Cleaning datasets...")

df_recipes['clean_name'] = df_recipes[
    'name'
].apply(clean_text)

df_recipes['clean_ingredients'] = df_recipes[
    'ingredients'
].apply(clean_text)

df_recipes['clean_tags'] = df_recipes[
    'tags'
].apply(clean_text)

# ============================================================
# BOOST FOOD NAMES
# ============================================================

df_recipes['food_text'] = (

    df_recipes['clean_name'].fillna('') + " " +
    df_recipes['clean_name'].fillna('') + " " +
    df_recipes['clean_name'].fillna('') + " " +

    df_recipes['clean_ingredients'].fillna('') + " " +

    df_recipes['clean_tags'].fillna('')
)

# ============================================================
# CLEAN INDONESIAN DATASET
# ============================================================

df_indo['clean_title'] = df_indo[
    'Title'
].apply(clean_text)

df_indo['clean_ingredients'] = df_indo[
    'Ingredients'
].apply(clean_text)

df_indo['food_text'] = (

    df_indo['clean_title'].fillna('') + " " +
    df_indo['clean_title'].fillna('') + " " +
    df_indo['clean_title'].fillna('') + " " +

    df_indo['clean_ingredients'].fillna('')
)

print("✅ Cleaning Completed!")

# ============================================================
# TF-IDF
# ============================================================

print("\n📊 Building TF-IDF Matrix...")

tfidf = TfidfVectorizer(

    stop_words='english',

    max_features=5000
)

tfidf_matrix = tfidf.fit_transform(
    df_recipes['food_text']
)

print(f"✅ TF-IDF Shape: {tfidf_matrix.shape}")

# ============================================================
# BAYESIAN RATING
# ============================================================

print("\n⭐ Calculating Bayesian Rating...")

review_stats = df_interactions.groupby(
    'recipe_id'
).agg({

    'rating': ['mean', 'count']
})

review_stats.columns = [
    'average_rating',
    'review_count'
]

review_stats = review_stats.reset_index()

df_master = df_recipes.merge(

    review_stats,

    on='recipe_id',

    how='left'
)

df_master['average_rating'] = df_master[
    'average_rating'
].fillna(0)

df_master['review_count'] = df_master[
    'review_count'
].fillna(0)

C = max(
    df_master['review_count'].median(),
    1
)

m = max(
    df_master['average_rating'].mean(),
    1
)

df_master['bayesian_rating'] = (

    (
        df_master['review_count'] /

        (
            df_master['review_count'] + C
        )
    ) * df_master['average_rating']

) + (

    (
        C /

        (
            df_master['review_count'] + C
        )
    ) * m
)

scaler = MinMaxScaler()

df_master['bayesian_rating_norm'] = scaler.fit_transform(

    df_master[['bayesian_rating']]
)

print("✅ Bayesian Rating Completed!")

# ============================================================
# PREPARE INDONESIAN DATASET
# ============================================================

indo_master = pd.DataFrame({

    'recipe_id':

        range(
            1000000,
            1000000 + len(df_indo)
        ),

    'name':

        df_indo['Title'],

    'food_text':

        df_indo['food_text']
})

indo_master['bayesian_rating_norm'] = 0.7

# ============================================================
# KEEP IMPORTANT COLUMNS
# ============================================================

df_master = df_master[
    [
        'recipe_id',
        'name',
        'food_text',
        'bayesian_rating_norm'
    ]
]

# ============================================================
# MERGE INDONESIAN FOOD
# ============================================================

df_master = pd.concat(

    [
        df_master,
        indo_master
    ],

    ignore_index=True
)

print(f"\n✅ Indonesian Foods Merged: {df_master.shape}")

# ============================================================
# REBUILD FINAL TF-IDF
# ============================================================

tfidf_matrix = tfidf.fit_transform(
    df_master['food_text']
)

print("✅ Final TF-IDF Ready!")

# ============================================================
# BILINGUAL MAP
# ============================================================

BILINGUAL_MAP = {

    'ayam': 'chicken',
    'ikan': 'fish',
    'daging': 'beef',
    'mie': 'noodle',
    'pedas': 'spicy',
    'manis': 'sweet',
    'goreng': 'fried',
    'bakar': 'grilled',
    'bakso': 'meatball',
    'sate': 'satay',
    'nasi goreng': 'fried rice',
    'mie ayam': 'chicken noodle'
}

# ============================================================
# FOOD ALIAS
# ============================================================

INDO_FOOD_ALIAS = {

    'ayam': [

        'fried chicken',
        'grilled chicken',
        'chicken satay',
        'chicken noodle',
        'ayam goreng',
        'ayam bakar',
        'ayam geprek',
        'mie ayam',
        'sate ayam'
    ],

    'mie': [

        'noodle',
        'ramen',
        'udon',
        'mie ayam'
    ],

    'bakso': [

        'meatball',
        'bakso ayam'
    ]
}

# ============================================================
# SMART CATEGORY
# ============================================================

SMART_CATEGORY = {

    'mie': 'noodle',
    'ramen': 'noodle',
    'ayam': 'chicken',
    'bakso': 'meatball',
    'sate': 'grilled',
    'cake': 'dessert'
}

# ============================================================
# SESSION STATE
# ============================================================

class SessionState:

    def __init__(self):

        self.swipe_weights = defaultdict(float)

        self.liked_recipes = []

        self.disliked_recipes = []

        self.recommended_history = []

        self.mood_weights = {}

session = SessionState()

print("✅ Session Initialized")

# ============================================================
# MOOD PREFERENCE
# ============================================================

MOOD_KEYWORDS = {

    'pedas': [
        'spicy',
        'chili'
    ],

    'seafood': [
        'fish',
        'shrimp'
    ],

    'dessert': [
        'cake',
        'sweet'
    ],

    'grilled food': [
        'grilled',
        'barbecue'
    ]
}

def set_mood_preferences(moods):

    session.mood_weights.clear()

    for mood in moods:

        keywords = MOOD_KEYWORDS.get(
            mood,
            [mood]
        )

        for kw in keywords:

            session.mood_weights[kw] = 0.6

# ============================================================
# FUZZY SEARCH
# ============================================================

def fuzzy_search(query):

    candidates = df_master[
        'name'
    ].dropna().unique().tolist()

    result = process.extractOne(

        query,

        candidates,

        scorer=fuzz.ratio,

        score_cutoff=70
    )

    if result:

        return result[0]

    return None

# ============================================================
# EXTRACT KEYWORDS
# ============================================================

def extract_keywords(recipe_id, top_n=5):

    idx = df_master[
        df_master['recipe_id'] == recipe_id
    ].index

    if len(idx) == 0:

        return []

    idx = idx[0]

    feature_names = np.array(
        tfidf.get_feature_names_out()
    )

    vec = tfidf_matrix[idx].toarray().flatten()

    top_indices = vec.argsort()[-top_n:][::-1]

    return feature_names[top_indices].tolist()

# ============================================================
# SWIPE LEARNING
# ============================================================

def update_swipe(recipe_id, action):

    keywords = extract_keywords(recipe_id)

    for kw in keywords:

        if action == 'like':

            session.swipe_weights[kw] += 0.15

        elif action == 'dislike':

            session.swipe_weights[kw] -= 0.05

    top_weights = dict(

        sorted(

            session.swipe_weights.items(),

            key=lambda x: x[1],

            reverse=True

        )[:10]
    )

    print(f"\n📊 Top Preference Weights:")
    print(top_weights)

# ============================================================
# PREFERENCE BOOST
# ============================================================

def compute_preference_boost(food_text):

    combined = {

        **session.mood_weights,

        **session.swipe_weights
    }

    boost = 0

    food_text = food_text.lower()

    for kw, weight in combined.items():

        if kw in food_text:

            boost += weight * 0.15

    return min(boost, 0.5)

# ============================================================
# EXPLANATION SYSTEM
# ============================================================

def explain_recommendation(row, query_keywords):

    reasons = []

    matched = [

        kw for kw in query_keywords

        if kw in row['food_text']
    ]

    if matched:

        reasons.append(
            f"mengandung '{matched[0]}'"
        )

    if row['bayesian_rating_norm'] > 0.8:

        reasons.append(
            "rating tinggi"
        )

    if session.swipe_weights:

        reasons.append(
            "sesuai preferensi swipe"
        )

    if not reasons:

        reasons.append(
            "makanan populer"
        )

    return "; ".join(reasons)

# ============================================================
# MAIN RECOMMENDATION FUNCTION
# ============================================================

def recommend_food_natural(

    query,

    top_n=10
):

    query = query.lower().strip()

    translated_query = BILINGUAL_MAP.get(
        query,
        query
    )

    print(f"\n🔍 Query: {query} → {translated_query}")

    # ========================================================
    # QUERY EXPANSION
    # ========================================================

    expanded_keywords = [

        translated_query
    ]

    if query in INDO_FOOD_ALIAS:

        expanded_keywords.extend(
            INDO_FOOD_ALIAS[query]
        )

    pattern = "|".join(expanded_keywords)

    # ========================================================
    # FIND MATCHES
    # ========================================================

    matches = df_master[

        df_master['food_text'].str.contains(
            pattern,
            na=False
        )
    ]

    # ========================================================
    # FUZZY SEARCH
    # ========================================================

    if matches.empty:

        fuzzy_match = fuzzy_search(query)

        if fuzzy_match:

            print(f"\n💡 Did you mean: {fuzzy_match}")

            matches = df_master[

                df_master['name'].str.contains(
                    fuzzy_match,
                    case=False,
                    na=False
                )
            ]

    if matches.empty:

        print("\n❌ Food not found!")

        return pd.DataFrame()

    # ========================================================
    # INDONESIAN PRIORITY
    # ========================================================

    indo_matches = matches[

        matches['name'].str.contains(
            'ayam|mie|bakso|sate|nasi|goreng|bakar',
            case=False,
            na=False
        )
    ]

    priority_keywords = [

        'ayam goreng',
        'ayam bakar',
        'mie ayam',
        'bakso ayam',
        'sop ayam',
        'ayam geprek',
        'ayam penyet',
        'sate ayam',
        'nasi goreng',
        'ayam rica',
        'ayam woku'
    ]

    priority_matches = matches[

        matches['name'].str.contains(
            '|'.join(priority_keywords),
            case=False,
            na=False
        )
    ]

    if not priority_matches.empty:

        idx = priority_matches.index[0]

    elif not indo_matches.empty:

        idx = indo_matches.index[0]

    else:

        idx = matches.index[0]

    selected_food = df_master.iloc[idx]['name']

    print(f"\n✅ Selected Food:")
    print(selected_food)

    # ========================================================
    # COSINE SIMILARITY
    # ========================================================

    target_vector = tfidf_matrix[idx]

    similarity_scores = cosine_similarity(

        target_vector,

        tfidf_matrix

    ).flatten()

    temp_df = df_master.copy()

    temp_df['similarity_score'] = similarity_scores

    temp_df['preference_boost'] = temp_df[
        'food_text'
    ].apply(compute_preference_boost)

    # ========================================================
    # FINAL SCORE
    # ========================================================

    temp_df['final_score'] = (

        (0.6 * temp_df['similarity_score']) +

        (0.2 * temp_df['bayesian_rating_norm']) +

        (0.2 * temp_df['preference_boost'])
    )

    # ========================================================
    # SORT RESULTS
    # ========================================================

    results = temp_df.sort_values(

        by='final_score',

        ascending=False
    )

    results = results[
        results['name'] != selected_food
    ]

    results = results.drop_duplicates(
        subset='name'
    )

    final_results = results.head(top_n).copy()

    # ========================================================
    # EXPLANATION
    # ========================================================

    final_results['explanation'] = final_results.apply(

        lambda row:

        explain_recommendation(
            row,
            expanded_keywords
        ),

        axis=1
    )

    # ========================================================
    # SAVE HISTORY
    # ========================================================

    session.recommended_history.extend(
        final_results['name'].tolist()
    )

    return final_results[
        [
            'name',
            'similarity_score',
            'bayesian_rating_norm',
            'preference_boost',
            'final_score',
            'explanation'
        ]
    ]

# ============================================================
# DEMO
# ============================================================

print("\n" + "=" * 60)
print("🍗 FOODER DEMO")
print("=" * 60)

# ============================================================
# SET USER MOOD
# ============================================================

set_mood_preferences([

    'pedas',

    'grilled food'
])

# ============================================================
# SWIPE SIMULATION
# ============================================================

sample = df_master[

    df_master['food_text'].str.contains(
        'ayam',
        case=False,
        na=False
    )

].iloc[0]

print(f"\n👍 Simulated LIKE:")
print(sample['name'])

update_swipe(

    sample['recipe_id'],

    'like'
)

# ============================================================
# RECOMMENDATION TEST
# ============================================================

print("\n" + "=" * 60)
print("📋 RECOMMENDATION RESULT")
print("=" * 60)

result = recommend_food_natural(

    query='ayam',

    top_n=10
)

display(result)

# ============================================================
# HISTORY
# ============================================================

print("\n🕘 Recommendation History:")
print(session.recommended_history)

print("\n✅ FINAL PIPELINE COMPLETED!")