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

    # Enhanced debugging info
    debug_info = {
        "model_loader_exists": model_loader is not None,
        "model_object_exists": model_loader.model is not None if model_loader else False,
        "model_path": model_loader.model_path if model_loader else None,
        "framework": model_loader.framework if model_loader else None,
    }

    logger.info(f"Health check - Debug info: {debug_info}")

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


@router.get("/debug")
async def debug_info(api_key: str = Depends(verify_api_key)):
    """
    Debug endpoint to check model loading state and file system.
    """
    import os
    import glob

    debug_data = {
        "model_loader_exists": model_loader is not None,
        "model_exists": model_loader.model is not None if model_loader else False,
        "model_path": model_loader.model_path if model_loader else None,
        "framework": model_loader.framework if model_loader else None,
        "user_model_dir_exists": os.path.exists("/app/user_model"),
        "user_model_files": [],
        "all_files_in_user_model": [],
    }

    # List all files in /app/user_model
    if os.path.exists("/app/user_model"):
        try:
            for root, dirs, files in os.walk("/app/user_model"):
                for file in files:
                    full_path = os.path.join(root, file)
                    debug_data["all_files_in_user_model"].append({
                        "path": full_path,
                        "size": os.path.getsize(full_path),
                        "exists": os.path.exists(full_path),
                    })
        except Exception as e:
            debug_data["file_listing_error"] = str(e)

    # Search for model files
    model_extensions = [".pkl", ".pt", ".pth", ".h5", ".onnx", ".joblib", ".keras"]
    for ext in model_extensions:
        matches = glob.glob(f"/app/user_model/**/*{ext}", recursive=True)
        if matches:
            debug_data["user_model_files"].extend(matches)

    return debug_data
