import time
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import PredictRequest, PredictResponse, HealthResponse
from app.core.security import verify_api_key
from app.utils.model_loader import ModelLoader

logger = logging.getLogger(__name__)

router = APIRouter()

# Global model instance (loaded on startup)
model_loader: ModelLoader = None


def get_model_loader() -> ModelLoader:
    """Dependency to get the model loader instance."""
    if model_loader is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded yet. Please wait for initialization.",
        )
    return model_loader


@router.post("/predict", response_model=PredictResponse)
async def predict(
    request: PredictRequest,
    api_key: str = Depends(verify_api_key),
    loader: ModelLoader = Depends(get_model_loader),
):
    """
    Run inference on the loaded model.

    Requires X-API-Key header for authentication.
    """
    try:
        start_time = time.time()

        # Run prediction
        prediction = loader.predict(request.input)

        # Calculate inference time
        inference_time = (time.time() - start_time) * 1000  # ms

        # Convert prediction to serializable format
        if hasattr(prediction, "tolist"):
            prediction = prediction.tolist()
        elif hasattr(prediction, "numpy"):
            prediction = prediction.numpy().tolist()

        return PredictResponse(
            prediction=prediction,
            model_id=loader.model_path,
            framework=loader.framework,
            metadata={"inference_time_ms": round(inference_time, 2)},
        )

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint (no auth required).
    """
    model_loaded = model_loader is not None and model_loader.model is not None

    return HealthResponse(
        status="healthy" if model_loaded else "initializing",
        model_loaded=model_loaded,
        model_id=model_loader.model_path if model_loaded else None,
        framework=model_loader.framework if model_loaded else None,
    )


@router.get("/info")
async def model_info(api_key: str = Depends(verify_api_key)):
    """
    Get detailed model information.

    Requires authentication.
    """
    if model_loader is None or model_loader.model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded",
        )

    return {
        "model_path": model_loader.model_path,
        "framework": model_loader.framework,
        "status": "ready",
    }
