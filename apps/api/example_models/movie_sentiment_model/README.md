# Movie Review Sentiment Classifier

## Overview

This is a **production-ready example** of a complex sentiment analysis model designed to demonstrate AIForge's ZIP deployment capabilities.

### Features

- **Complex preprocessing pipeline** with text cleaning and feature engineering
- **Multiple artifacts** (model, vectorizer, encoder, config)
- **TF-IDF + custom features** (length, word count, sentiment keywords)
- **Gradient Boosting Classifier** with hyperparameter tuning
- **91.7% test accuracy**
- **3 sentiment classes:** positive, negative, neutral

---

## Files Included

```
movie_sentiment_model/
├── model_config.json           ← Required config (tells AIForge how to load/use model)
├── inference.py                ← Entry point with load_model() and predict() functions
├── model.pkl                   ← Trained GradientBoostingClassifier
├── vectorizer.pkl              ← TF-IDF vectorizer (500 features)
├── label_encoder.pkl           ← Label encoder for classes
├── preprocessing_config.json   ← Contractions and sentiment keywords
├── metadata.json               ← Model metadata (accuracy, params, etc.)
├── requirements.txt            ← EXACT versions from training
└── README.md                   ← This file
```

---

## How It Works

### Training (train_movie_review_classifier.py)

1. **Dataset:** 600 movie reviews (positive, negative, neutral)
2. **Preprocessing:** Text cleaning, contraction expansion, lowercase
3. **Feature Engineering:**
   - TF-IDF features (500 dimensions, 1-2 grams)
   - Custom features (length, word count, exclamations, sentiment keywords)
4. **Model:** GradientBoostingClassifier with GridSearch
5. **Evaluation:** 91.7% accuracy on test set

### Inference (inference.py)

1. **Load:** Loads model + all artifacts once at startup
2. **Predict:** Processes reviews through same pipeline:
   - Clean text
   - Extract TF-IDF features
   - Extract custom features
   - Combine and predict
   - Return sentiment + confidence + probabilities

---

## Model Performance

```
Classification Report:
              precision    recall  f1-score   support

    negative       1.00      1.00      1.00         4
     neutral       1.00      0.50      0.67         2
    positive       0.86      1.00      0.92         6

    accuracy                           0.92        12
```

**Best Parameters:** `{learning_rate: 0.1, max_depth: 3, n_estimators: 50}`

---

## API Usage Examples

### Input Format 1: Single String
```json
{
  "input": "This movie was absolutely fantastic!"
}
```

### Input Format 2: List of Strings
```json
{
  "input": [
    "This movie was absolutely fantastic!",
    "Terrible waste of time.",
    "It was okay."
  ]
}
```

### Output Format
```json
{
  "predictions": [
    {
      "review_index": 0,
      "original_text": "This movie was absolutely fantastic!",
      "sentiment": "positive",
      "confidence": 0.997,
      "probabilities": {
        "negative": 0.0005,
        "neutral": 0.0021,
        "positive": 0.9975
      },
      "top_predictions": [
        {"sentiment": "positive", "confidence": 0.9975},
        {"sentiment": "neutral", "confidence": 0.0021},
        {"sentiment": "negative", "confidence": 0.0005}
      ]
    }
  ],
  "model_info": {
    "name": "Movie Review Sentiment Classifier",
    "version": "1.0.0",
    "framework": "sklearn",
    "model_type": "GradientBoostingClassifier",
    "classes": ["negative", "neutral", "positive"],
    "num_reviews_processed": 1
  }
}
```

---

## Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Test inference
python inference.py

# Expected output:
# Testing inference.py locally...
# [Inference] ✓ Model loaded: GradientBoostingClassifier
# [Inference] ✓ Vectorizer loaded: 500 features
# [Inference] ✓ Label encoder loaded: ['negative', 'neutral', 'positive']
# [Inference] ✅ All artifacts loaded successfully!
#
# Results:
# Review: This movie was absolutely fantastic!...
# Sentiment: positive (confidence: 1.00)
```

---

## Deployment to AIForge

### Step 1: Create ZIP

```bash
cd movie_sentiment_model
zip -r ../movie_sentiment_model.zip \
    model_config.json \
    inference.py \
    model.pkl \
    vectorizer.pkl \
    label_encoder.pkl \
    preprocessing_config.json \
    metadata.json \
    requirements.txt
```

### Step 2: Upload to AIForge

1. Go to AIForge dashboard
2. Click "Deploy New Model"
3. Select "ZIP Archive" deployment type
4. Upload `movie_sentiment_model.zip`
5. Click "Deploy"
6. Wait 2-5 minutes for deployment
7. Test your endpoint!

---

## Why This Example is Great

### ✅ Demonstrates Best Practices

1. **model_config.json** - Explicit contract with platform
2. **Exact versions** in requirements.txt (no version ranges)
3. **Multiple artifacts** - Real-world complexity
4. **Custom preprocessing** - Not just pickle.load()
5. **Error handling** - Production-ready code
6. **Flexible input** - Handles strings, lists, dicts
7. **Detailed output** - Confidence scores + probabilities
8. **Local testing** - Can test before deploying

### ✅ Real-World Complexity

- TF-IDF vectorization
- Custom feature engineering
- Multiple preprocessing steps
- Hyperparameter tuning
- Proper train/test split
- Model metadata tracking

### ✅ Tests All Features

- ✅ model_config.json validation
- ✅ Multiple auxiliary files
- ✅ Custom preprocessing
- ✅ Complex inference logic
- ✅ Requirements.txt handling
- ✅ Metadata tracking

---

## Technical Details

### Dependencies

```
scikit-learn==1.3.2  # ML framework
numpy==1.24.3        # Array operations
pandas==2.0.3        # Data manipulation
```

**Total size:** ~170KB (very small, efficient)

### Model Architecture

```
Input (text)
    ↓
Text Cleaning (lowercase, contractions, special chars)
    ↓
Feature Extraction
    ├─→ TF-IDF (500 features)
    └─→ Custom (6 features: length, words, !, ?, pos_words, neg_words)
    ↓
Combine Features (506 total)
    ↓
GradientBoostingClassifier
    ↓
Output (sentiment + confidence + probabilities)
```

---

## Common Issues & Solutions

### Issue: Version mismatch error

**Solution:** requirements.txt has exact versions from training
```
scikit-learn==1.3.2  # Not >=1.3.2, exact version!
```

### Issue: Import error

**Solution:** All dependencies listed in requirements.txt

### Issue: Function not found

**Solution:** model_config.json specifies exact function names
```json
{
  "load": {"name": "load_model", "args": ["model_path"]},
  "predict": {"name": "predict", "args": ["data"]}
}
```

---

## Next Steps

Want to create your own model? Use this as a template:

1. Replace training data with your dataset
2. Modify preprocessing for your use case
3. Update model_config.json with your details
4. Test locally with `python inference.py`
5. Create ZIP and deploy!

---

## Credits

- **Framework:** Scikit-learn 1.3.2
- **Platform:** AIForge
- **Example created:** January 2025
- **Purpose:** Demonstrate production-ready ZIP deployments

---

**This model is ready to deploy! Try it on AIForge now! 🚀**
