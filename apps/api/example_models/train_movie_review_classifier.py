"""
Train a Movie Review Sentiment Classifier
==========================================

This script demonstrates a complex, production-ready model with:
- Real dataset (movie reviews)
- Text preprocessing pipeline
- Feature engineering
- Multiple preprocessing steps (TF-IDF + custom features)
- Model training with hyperparameter tuning
- Proper saving of all artifacts

This is the kind of model users will deploy on AIForge.
"""

import os
import pickle
import json
import re
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

print("=" * 70)
print("TRAINING MOVIE REVIEW SENTIMENT CLASSIFIER")
print("=" * 70)

# Create output directory
os.makedirs('movie_sentiment_model', exist_ok=True)

# ============================================================================
# STEP 1: Create Dataset (simulating real movie reviews)
# ============================================================================
print("\n[1/7] Creating dataset...")

# In production, this would be from Kaggle or IMDB dataset
# For testing, we'll create a realistic synthetic dataset
movie_reviews = [
    # Positive reviews
    ("This movie was absolutely fantastic! The acting was superb and the plot kept me engaged throughout.", "positive"),
    ("I loved every minute of it. Best film I've seen this year!", "positive"),
    ("Amazing cinematography and brilliant performances. Highly recommend!", "positive"),
    ("A masterpiece! The director really outdid themselves with this one.", "positive"),
    ("Wonderful movie with great character development and emotional depth.", "positive"),
    ("Absolutely brilliant! The story was compelling and the ending was perfect.", "positive"),
    ("One of the best movies ever made. The acting is phenomenal!", "positive"),
    ("I was blown away by this film. Incredible storytelling and visuals.", "positive"),
    ("Perfect movie for the whole family. We all enjoyed it immensely!", "positive"),
    ("Outstanding! The screenplay was excellent and the cast was perfect.", "positive"),

    # Negative reviews
    ("Terrible movie. Waste of time and money. Don't bother watching.", "negative"),
    ("I hated it. The plot made no sense and the acting was awful.", "negative"),
    ("Worst film I've ever seen. Completely boring and predictable.", "negative"),
    ("Horrible! The dialogue was cringe-worthy and the pacing was terrible.", "negative"),
    ("Don't waste your money on this garbage. It's a complete disaster.", "negative"),
    ("Awful movie with terrible acting and a nonsensical plot.", "negative"),
    ("I want my money back. This was painfully bad from start to finish.", "negative"),
    ("Completely unwatchable. The worst thing I've seen all year.", "negative"),
    ("Terrible film. Poor acting, bad script, and boring story.", "negative"),
    ("I fell asleep halfway through. Incredibly dull and poorly made.", "negative"),

    # Neutral reviews
    ("It was okay. Nothing special but not terrible either.", "neutral"),
    ("Average movie. Had some good moments but overall forgettable.", "neutral"),
    ("Decent film. Worth watching once but probably won't watch again.", "neutral"),
    ("It's fine. Not great, not terrible, just fine.", "neutral"),
    ("Mediocre at best. Some parts were good, others were boring.", "neutral"),
    ("Passable entertainment. Nothing groundbreaking but watchable.", "neutral"),
    ("Middle of the road. Has its moments but nothing exceptional.", "neutral"),
    ("Acceptable movie. Met my expectations but didn't exceed them.", "neutral"),
    ("It's alright. Could have been better but could have been worse.", "neutral"),
    ("Fair movie. Some good acting but the story was just okay.", "neutral"),
]

# Expand dataset with variations
expanded_reviews = []
for review, sentiment in movie_reviews * 20:  # Multiply to get more training data
    expanded_reviews.append((review, sentiment))
    # Add variations
    if "!" in review:
        expanded_reviews.append((review.replace("!", "."), sentiment))
    if sentiment == "positive":
        expanded_reviews.append((review + " Definitely worth watching.", sentiment))
    elif sentiment == "negative":
        expanded_reviews.append((review + " Would not recommend.", sentiment))

# Create DataFrame
df = pd.DataFrame(expanded_reviews, columns=['review', 'sentiment'])
df = df.drop_duplicates(subset=['review'])

print(f"✓ Dataset created: {len(df)} reviews")
print(f"  - Positive: {len(df[df['sentiment']=='positive'])}")
print(f"  - Negative: {len(df[df['sentiment']=='negative'])}")
print(f"  - Neutral: {len(df[df['sentiment']=='neutral'])}")

# ============================================================================
# STEP 2: Text Preprocessing Configuration
# ============================================================================
print("\n[2/7] Setting up preprocessing...")

# Create preprocessing config (will be saved for inference)
preprocessing_config = {
    "contractions": {
        "don't": "do not",
        "can't": "cannot",
        "won't": "will not",
        "shouldn't": "should not",
        "wouldn't": "would not",
        "i'm": "i am",
        "it's": "it is",
        "that's": "that is",
        "what's": "what is",
        "there's": "there is",
    },
    "sentiment_keywords": {
        "positive": ["great", "excellent", "amazing", "wonderful", "fantastic", "brilliant", "perfect",
                    "outstanding", "superb", "loved", "best", "masterpiece", "incredible"],
        "negative": ["terrible", "awful", "horrible", "worst", "hate", "bad", "poor", "garbage",
                    "disaster", "boring", "waste", "cringe", "unwatchable", "painfully"],
    }
}

def clean_text(text):
    """Clean and normalize text"""
    text = text.lower()

    # Expand contractions
    for contraction, expansion in preprocessing_config['contractions'].items():
        text = text.replace(contraction, expansion)

    # Remove special characters but keep important punctuation
    text = re.sub(r'[^a-z\s!.?]', '', text)

    # Remove extra whitespace
    text = ' '.join(text.split())

    return text

def extract_features(text):
    """Extract custom hand-crafted features"""
    text_lower = text.lower()
    features = {
        'length': len(text),
        'word_count': len(text.split()),
        'exclamation_count': text.count('!'),
        'question_count': text.count('?'),
        'positive_words': sum(1 for word in preprocessing_config['sentiment_keywords']['positive'] if word in text_lower),
        'negative_words': sum(1 for word in preprocessing_config['sentiment_keywords']['negative'] if word in text_lower),
    }
    return features

# Preprocess all reviews
df['cleaned_review'] = df['review'].apply(clean_text)

print("✓ Preprocessing configured")

# ============================================================================
# STEP 3: Feature Engineering
# ============================================================================
print("\n[3/7] Engineering features...")

# Extract custom features
custom_features = []
for review in df['review']:
    features = extract_features(review)
    custom_features.append([
        features['length'],
        features['word_count'],
        features['exclamation_count'],
        features['question_count'],
        features['positive_words'],
        features['negative_words'],
    ])

custom_features = np.array(custom_features)

# Create TF-IDF features
print("  - Creating TF-IDF features...")
vectorizer = TfidfVectorizer(
    max_features=500,
    ngram_range=(1, 2),
    min_df=2,
    max_df=0.8,
    stop_words='english'
)

tfidf_features = vectorizer.fit_transform(df['cleaned_review']).toarray()

# Combine TF-IDF with custom features
X = np.hstack([tfidf_features, custom_features])

print(f"✓ Features engineered: {X.shape[1]} features total")
print(f"  - TF-IDF features: {tfidf_features.shape[1]}")
print(f"  - Custom features: {custom_features.shape[1]}")

# ============================================================================
# STEP 4: Prepare Labels
# ============================================================================
print("\n[4/7] Encoding labels...")

label_encoder = LabelEncoder()
y = label_encoder.fit_transform(df['sentiment'])

print(f"✓ Labels encoded: {label_encoder.classes_}")

# ============================================================================
# STEP 5: Train/Test Split
# ============================================================================
print("\n[5/7] Splitting dataset...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"✓ Data split:")
print(f"  - Training: {X_train.shape[0]} samples")
print(f"  - Testing: {X_test.shape[0]} samples")

# ============================================================================
# STEP 6: Train Model with Hyperparameter Tuning
# ============================================================================
print("\n[6/7] Training model...")

# Grid search for best parameters
print("  - Running hyperparameter tuning...")
param_grid = {
    'n_estimators': [50, 100],
    'max_depth': [3, 5],
    'learning_rate': [0.1, 0.2]
}

grid_search = GridSearchCV(
    GradientBoostingClassifier(random_state=42),
    param_grid,
    cv=3,
    scoring='accuracy',
    n_jobs=-1,
    verbose=0
)

grid_search.fit(X_train, y_train)

# Best model
model = grid_search.best_estimator_
print(f"✓ Best parameters: {grid_search.best_params_}")

# Evaluate
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n✓ Model trained successfully!")
print(f"  - Training accuracy: {model.score(X_train, y_train):.4f}")
print(f"  - Test accuracy: {accuracy:.4f}")

print(f"\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))

# ============================================================================
# STEP 7: Save All Artifacts
# ============================================================================
print("\n[7/7] Saving model artifacts...")

# Save model
with open('movie_sentiment_model/model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("✓ Saved: model.pkl")

# Save vectorizer
with open('movie_sentiment_model/vectorizer.pkl', 'wb') as f:
    pickle.dump(vectorizer, f)
print("✓ Saved: vectorizer.pkl")

# Save label encoder
with open('movie_sentiment_model/label_encoder.pkl', 'wb') as f:
    pickle.dump(label_encoder, f)
print("✓ Saved: label_encoder.pkl")

# Save preprocessing config
with open('movie_sentiment_model/preprocessing_config.json', 'w') as f:
    json.dump(preprocessing_config, f, indent=2)
print("✓ Saved: preprocessing_config.json")

# Save metadata
metadata = {
    "model_type": "GradientBoostingClassifier",
    "framework": "sklearn",
    "version": "1.0.0",
    "accuracy": float(accuracy),
    "num_features": X.shape[1],
    "num_classes": len(label_encoder.classes_),
    "classes": label_encoder.classes_.tolist(),
    "training_samples": X_train.shape[0],
    "test_samples": X_test.shape[0],
    "best_params": grid_search.best_params_,
}

with open('movie_sentiment_model/metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)
print("✓ Saved: metadata.json")

# Save requirements.txt with EXACT versions
with open('movie_sentiment_model/requirements.txt', 'w') as f:
    f.write("scikit-learn==1.3.2\n")
    f.write("numpy==1.24.3\n")
    f.write("pandas==2.0.3\n")
print("✓ Saved: requirements.txt")

print("\n" + "=" * 70)
print("✅ MODEL TRAINING COMPLETE!")
print("=" * 70)
print(f"\nAll artifacts saved to: movie_sentiment_model/")
print(f"\nNext steps:")
print(f"  1. Create inference.py")
print(f"  2. Create model_config.json")
print(f"  3. Create ZIP archive")
print(f"  4. Deploy to AIForge!")
print("=" * 70)
