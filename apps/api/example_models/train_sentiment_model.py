#!/usr/bin/env python3
"""
Train a sentiment analysis model for product reviews.
This creates a more realistic model with:
- Larger training dataset
- Better feature engineering (TF-IDF with bigrams)
- Model evaluation metrics
- Proper train/test split
"""

import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import numpy as np

# More comprehensive training data
reviews = [
    # Positive reviews (label 1)
    "This product is amazing! Best purchase ever!",
    "Absolutely love it! Exceeded all my expectations.",
    "Great quality and fast shipping. Highly recommend!",
    "Perfect! Exactly what I was looking for.",
    "Outstanding product! Worth every penny.",
    "Fantastic quality! Will definitely buy again.",
    "Impressed with the build quality and performance.",
    "Excellent value for money. Very satisfied!",
    "This is exactly as described. Very happy!",
    "Superior product! Can't believe how good it is.",
    "Best in class! Highly recommended to everyone.",
    "Wonderful experience from start to finish.",
    "Top notch quality and excellent customer service.",
    "Amazing features and easy to use.",
    "Love the design and functionality!",
    "Superb quality! Better than I expected.",
    "Perfect fit and great durability.",
    "Excellent craftsmanship! Very impressed.",
    "Brilliant product! Solves my problem perfectly.",
    "Outstanding value! Best purchase this year.",
    "Incredible quality! Five stars all the way.",
    "Perfect for my needs! Love it!",
    "Great features and excellent performance.",
    "Highly satisfied with this purchase!",
    "Awesome product! Works flawlessly.",
    "Best quality I've seen in this price range.",
    "Fantastic! Exactly what I needed.",
    "Very pleased with this product.",
    "Excellent choice! No regrets at all.",
    "Superior to similar products I've tried.",

    # Negative reviews (label 0)
    "Terrible quality! Complete waste of money.",
    "Disappointed with this purchase. Not worth it.",
    "Poor quality and broke after one use.",
    "Worst product ever! Do not buy!",
    "Awful! Nothing like the description.",
    "Very unhappy with this. Returning it.",
    "Bad quality and terrible customer service.",
    "Horrible! Regret buying this.",
    "Not as advertised. Very disappointed.",
    "Cheap material and poor construction.",
    "Defective product! Doesn't work at all.",
    "Total waste of money! Avoid this.",
    "Terrible experience. Would not recommend.",
    "Poor design and bad quality control.",
    "Useless product! Don't waste your money.",
    "Disappointed! Expected much better quality.",
    "Awful product! Broke immediately.",
    "Not worth the price at all.",
    "Bad purchase decision. Very unhappy.",
    "Poor quality materials used.",
    "Terrible! Nothing works as promised.",
    "Very dissatisfied with this product.",
    "Horrible quality! Falling apart already.",
    "Waste of money! Terrible product.",
    "Bad experience from start to finish.",
    "Poor performance and cheap build.",
    "Awful! Would not buy again.",
    "Disappointed! Not what I expected.",
    "Terrible value! Overpriced and poor quality.",
    "Worst purchase I've made this year.",
]

# Labels (1 = positive, 0 = negative)
labels = [1] * 30 + [0] * 30

# Create DataFrame
df = pd.DataFrame({
    'review': reviews,
    'sentiment': labels
})

print("=" * 60)
print("SENTIMENT ANALYSIS MODEL TRAINING")
print("=" * 60)
print(f"\nDataset size: {len(df)} reviews")
print(f"Positive reviews: {sum(labels)} ({sum(labels)/len(labels)*100:.1f}%)")
print(f"Negative reviews: {len(labels)-sum(labels)} ({(len(labels)-sum(labels))/len(labels)*100:.1f}%)")

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    df['review'],
    df['sentiment'],
    test_size=0.25,
    random_state=42,
    stratify=df['sentiment']
)

print(f"\nTraining set: {len(X_train)} reviews")
print(f"Test set: {len(X_test)} reviews")

# Create pipeline with better feature extraction
model = Pipeline([
    ('vectorizer', TfidfVectorizer(
        max_features=100,
        ngram_range=(1, 2),  # Use unigrams and bigrams
        min_df=1,
        max_df=0.9,
        sublinear_tf=True  # Use sublinear term frequency scaling
    )),
    ('classifier', LogisticRegression(
        random_state=42,
        max_iter=1000,
        C=1.0,
        solver='lbfgs'
    ))
])

print("\n" + "=" * 60)
print("TRAINING MODEL...")
print("=" * 60)

# Train the model
model.fit(X_train, y_train)

print("✅ Training completed!")

# Evaluate on test set
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print("\n" + "=" * 60)
print("MODEL EVALUATION")
print("=" * 60)
print(f"\nTest Accuracy: {accuracy:.2%}")

print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['Negative', 'Positive']))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# Test with sample predictions
print("\n" + "=" * 60)
print("SAMPLE PREDICTIONS")
print("=" * 60)

test_reviews = [
    "This product is absolutely fantastic!",
    "Terrible quality, very disappointed",
    "Great value for money, highly recommend",
    "Waste of money, don't buy this",
    "Love it! Best purchase ever!",
]

for review in test_reviews:
    prediction = model.predict([review])[0]
    sentiment = "POSITIVE" if prediction == 1 else "NEGATIVE"
    print(f"\nReview: '{review}'")
    print(f"Sentiment: {sentiment}")

# Save the model
output_path = "sentiment_model/model.pkl"
print("\n" + "=" * 60)
print(f"SAVING MODEL: {output_path}")
print("=" * 60)

with open(output_path, 'wb') as f:
    pickle.dump(model, f)

print(f"✅ Model saved successfully!")
print(f"   Size: {len(pickle.dumps(model))} bytes")
print("\n" + "=" * 60)
print("MODEL TRAINING COMPLETE!")
print("=" * 60)
