import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert "AIForge" in response.json()["message"]


def test_health_check():
    """Test health endpoint (no auth required)."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data


def test_prediction_without_api_key():
    """Test prediction without API key (should fail)."""
    response = client.post(
        "/predict",
        json={"input": [[1, 2, 3, 4]]},
    )
    assert response.status_code == 401


def test_prediction_with_invalid_api_key():
    """Test prediction with invalid API key (should fail)."""
    response = client.post(
        "/predict",
        headers={"X-API-Key": "wrong-key"},
        json={"input": [[1, 2, 3, 4]]},
    )
    assert response.status_code == 403


# Add more tests as needed
# - Test with valid API key (requires model loaded)
# - Test different input formats
# - Test error handling
