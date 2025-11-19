"""
Movie Review Sentiment Classifier - Inference Script
=====================================================

This demonstrates a production-ready inference script with:
- Multiple artifact loading (model, vectorizer, encoder, config)
- Text preprocessing pipeline
- Feature engineering
- Error handling
- Flexible input handling
- Detailed predictions with confidence scores

This is the entry point that AIForge will use.
"""

import os
import pickle
import json
import re
import numpy as np
from typing import List, Dict, Any, Union

# Global variables to store loaded artifacts
_model = None
_vectorizer = None
_label_encoder = None
_preprocessing_config = None


def load_model(model_path: str) -> Any:
    """
    Load all model artifacts.

    This function is called ONCE when the container starts.
    It loads the model and all preprocessing artifacts.

    Args:
        model_path: Path to the main model file (model.pkl)

    Returns:
        The loaded model object
    """
    global _model, _vectorizer, _label_encoder, _preprocessing_config

    # Get model directory
    model_dir = os.path.dirname(model_path)

    # If model_path is just a filename (no directory), use current directory
    if not model_dir:
        model_dir = "."
        print("[Inference] Warning: model_path has no directory, using current directory")

    print("[Inference] Loading movie sentiment classifier...")
    print(f"[Inference] Model path: {model_path}")
    print(f"[Inference] Model directory: {model_dir}")
    print(f"[Inference] Model file exists: {os.path.exists(model_path)}")

    # Load main model
    print("[Inference] Loading model...")
    try:
        with open(model_path, 'rb') as f:
            _model = pickle.load(f)
        print(f"[Inference] ✓ Model loaded: {type(_model).__name__}")
    except Exception as e:
        print(f"[Inference] ❌ Failed to load model from {model_path}: {e}")
        raise

    # Load vectorizer
    vectorizer_path = os.path.join(model_dir, "vectorizer.pkl")
    print(f"[Inference] Loading vectorizer from {vectorizer_path}...")
    print(f"[Inference] Vectorizer exists: {os.path.exists(vectorizer_path)}")
    try:
        with open(vectorizer_path, 'rb') as f:
            _vectorizer = pickle.load(f)
        print(f"[Inference] ✓ Vectorizer loaded: {_vectorizer.max_features} features")
    except Exception as e:
        print(f"[Inference] ❌ Failed to load vectorizer from {vectorizer_path}: {e}")
        raise

    # Load label encoder
    encoder_path = os.path.join(model_dir, "label_encoder.pkl")
    print(f"[Inference] Loading label encoder from {encoder_path}...")
    print(f"[Inference] Encoder exists: {os.path.exists(encoder_path)}")
    try:
        with open(encoder_path, 'rb') as f:
            _label_encoder = pickle.load(f)
        print(f"[Inference] ✓ Label encoder loaded: {list(_label_encoder.classes_)}")
    except Exception as e:
        print(f"[Inference] ❌ Failed to load label encoder from {encoder_path}: {e}")
        raise

    # Load preprocessing config
    config_path = os.path.join(model_dir, "preprocessing_config.json")
    print(f"[Inference] Loading preprocessing config from {config_path}...")
    print(f"[Inference] Config exists: {os.path.exists(config_path)}")
    try:
        with open(config_path, 'r') as f:
            _preprocessing_config = json.load(f)
        print(f"[Inference] ✓ Preprocessing config loaded")
    except Exception as e:
        print(f"[Inference] ❌ Failed to load preprocessing config from {config_path}: {e}")
        raise

    # Load and display metadata
    metadata_path = os.path.join(model_dir, "metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        print(f"[Inference] Model metadata:")
        print(f"[Inference]   - Accuracy: {metadata.get('accuracy', 'N/A'):.4f}")
        print(f"[Inference]   - Classes: {metadata.get('classes', [])}")

    print("[Inference] ✅ All artifacts loaded successfully!")

    return _model


def clean_text(text: str) -> str:
    """
    Clean and normalize text using the same preprocessing as training.

    Args:
        text: Raw review text

    Returns:
        Cleaned text
    """
    # Convert to lowercase
    text = text.lower()

    # Expand contractions
    for contraction, expansion in _preprocessing_config['contractions'].items():
        text = text.replace(contraction, expansion)

    # Remove special characters but keep important punctuation
    text = re.sub(r'[^a-z\s!.?]', '', text)

    # Remove extra whitespace
    text = ' '.join(text.split())

    return text


def extract_features(text: str) -> List[float]:
    """
    Extract custom hand-crafted features from text.

    Args:
        text: Original review text (before cleaning)

    Returns:
        List of feature values
    """
    text_lower = text.lower()

    # Count sentiment keywords
    positive_count = sum(
        1 for word in _preprocessing_config['sentiment_keywords']['positive']
        if word in text_lower
    )
    negative_count = sum(
        1 for word in _preprocessing_config['sentiment_keywords']['negative']
        if word in text_lower
    )

    features = [
        len(text),                          # Text length
        len(text.split()),                  # Word count
        text.count('!'),                    # Exclamation count
        text.count('?'),                    # Question count
        positive_count,                     # Positive keyword count
        negative_count,                     # Negative keyword count
    ]

    return features


def predict(input_data: Union[str, List[str], Dict[str, Any]]) -> Dict[str, Any]:
    """
    Make predictions on movie reviews.

    This function is called for EACH API request.
    It handles different input formats and returns detailed predictions.

    Args:
        input_data: Can be:
            - String: Single review
            - List: Multiple reviews
            - Dict: {"reviews": [...]} or {"input": [...]}

    Returns:
        Dictionary with predictions and metadata
    """
    global _model, _vectorizer, _label_encoder

    # Validate model is loaded
    if _model is None:
        raise RuntimeError(
            "Model not loaded! The load_model() function must be called first."
        )

    print(f"[Inference] Received prediction request, input_data type: {type(input_data)}")

    # Handle different input formats
    if isinstance(input_data, str):
        # Single review as string
        reviews = [input_data]
    elif isinstance(input_data, list):
        # List of reviews
        reviews = input_data
    elif isinstance(input_data, dict):
        # Dictionary with reviews key
        reviews = input_data.get('reviews', input_data.get('input', input_data.get('text', [])))
        if isinstance(reviews, str):
            reviews = [reviews]
    else:
        raise ValueError(
            f"Invalid input format. Expected string, list, or dict, got {type(input_data)}\n\n"
            f"Valid formats:\n"
            f'  - "This movie was great!"\n'
            f'  - ["Review 1", "Review 2"]\n'
            f'  - {{"reviews": ["Review 1", "Review 2"]}}'
        )

    if not reviews:
        raise ValueError("No reviews provided for prediction")

    print(f"[Inference] Processing {len(reviews)} review(s)...")

    # Preprocess all reviews
    cleaned_reviews = [clean_text(review) for review in reviews]

    # Extract TF-IDF features
    tfidf_features = _vectorizer.transform(cleaned_reviews).toarray()

    # Extract custom features
    custom_features_list = [extract_features(review) for review in reviews]
    custom_features = np.array(custom_features_list)

    # Combine features (same as training)
    X = np.hstack([tfidf_features, custom_features])

    print(f"[Inference] Features extracted: {X.shape}")

    # Make predictions
    predictions = _model.predict(X)
    probabilities = _model.predict_proba(X)

    # Format results
    results = []
    for i, (pred, probs) in enumerate(zip(predictions, probabilities)):
        # Decode label
        sentiment = _label_encoder.inverse_transform([pred])[0]

        # Get confidence
        confidence = float(probs.max())

        # Get all class probabilities
        all_probs = {
            class_name: float(prob)
            for class_name, prob in zip(_label_encoder.classes_, probs)
        }

        # Sort by probability
        sorted_probs = sorted(all_probs.items(), key=lambda x: x[1], reverse=True)

        result = {
            "review_index": i,
            "original_text": reviews[i],
            "cleaned_text": cleaned_reviews[i],
            "sentiment": sentiment,
            "confidence": confidence,
            "probabilities": all_probs,
            "top_predictions": [
                {"sentiment": sent, "confidence": conf}
                for sent, conf in sorted_probs
            ]
        }

        results.append(result)

    print(f"[Inference] ✓ Predictions completed")

    # Return in API-friendly format
    return {
        "predictions": results,
        "model_info": {
            "name": "Movie Review Sentiment Classifier",
            "version": "1.0.0",
            "framework": "sklearn",
            "model_type": type(_model).__name__,
            "classes": list(_label_encoder.classes_),
            "num_reviews_processed": len(reviews)
        }
    }


# Optional: Test function for local testing
if __name__ == "__main__":
    print("Testing inference.py locally...")

    # Test load_model
    load_model("model.pkl")

    # Test predictions
    test_reviews = [
        "This movie was absolutely fantastic! I loved every minute of it.",
        "Terrible waste of time. I want my money back.",
        "It was okay, nothing special."
    ]

    print("\nTesting predictions...")
    result = predict(test_reviews)

    print("\nResults:")
    for pred in result['predictions']:
        print(f"\nReview: {pred['original_text'][:50]}...")
        print(f"Sentiment: {pred['sentiment']} (confidence: {pred['confidence']:.2f})")
        print(f"All probabilities: {pred['probabilities']}")
