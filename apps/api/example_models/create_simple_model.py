"""
Example script to create a simple scikit-learn model for testing.
This creates a simple Iris classifier that you can use to test the API.
"""

import pickle
import json
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Load Iris dataset
print("Loading Iris dataset...")
iris = load_iris()
X, y = iris.data, iris.target

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
print("Training Random Forest classifier...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f"Model accuracy: {accuracy:.2%}")

# Save model
model_path = "model.pkl"
with open(model_path, "wb") as f:
    pickle.dump(model, f)
print(f"Model saved to: {model_path}")

# Create metadata
metadata = {
    "name": "Iris Classifier",
    "framework": "sklearn",
    "version": "1.0.0",
    "description": "Random Forest classifier for Iris dataset",
    "input_shape": [4],
    "output_classes": ["setosa", "versicolor", "virginica"],
    "accuracy": accuracy,
    "features": ["sepal_length", "sepal_width", "petal_length", "petal_width"],
    "example_input": [[5.1, 3.5, 1.4, 0.2]],
    "expected_output": 0,
}

with open("metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)
print("Metadata saved to: metadata.json")

# Test prediction
print("\nTesting prediction...")
example_input = [[5.1, 3.5, 1.4, 0.2]]
prediction = model.predict(example_input)
probabilities = model.predict_proba(example_input)
print(f"Input: {example_input}")
print(f"Prediction: {iris.target_names[prediction[0]]}")
print(f"Probabilities: {probabilities[0]}")

print("\n✅ Model creation complete!")
print("\nTo test with the API:")
print("1. Copy model.pkl to apps/api/models/")
print("2. Run: docker-compose up")
print("3. Test: ./scripts/test-local.sh")
