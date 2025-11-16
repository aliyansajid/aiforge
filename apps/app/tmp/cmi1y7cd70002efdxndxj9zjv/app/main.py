import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import predict_router
from app.routers.predict import model_loader
from app.utils.model_loader import ModelLoader
from app.utils.gcs import GCSClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events - startup and shutdown.
    Load model on startup, cleanup on shutdown.
    """
    settings = get_settings()
    logger.info("Starting AIForge Model API...")

    # Load model on startup
    global model_loader
    from app.routers import predict

    predict.model_loader = ModelLoader()

    # Try to load model (either from GCS or local path)
    try:
        # Download from GCS if requested
        if settings.download_model_on_startup and settings.model_id:
            logger.info(f"Loading model from GCS: {settings.model_id}")

            if settings.gcs_bucket_models:
                gcs_client = GCSClient(
                    bucket_name=settings.gcs_bucket_models,
                    credentials_path=settings.google_application_credentials,
                )

                # Extract user_id from model_id (format: user_id/model_id)
                if "/" in settings.model_id:
                    user_id, model_name = settings.model_id.split("/", 1)
                    model_dir = gcs_client.download_model_files(
                        model_id=model_name, user_id=user_id
                    )

                    if model_dir:
                        # Find the actual model file
                        for ext in [".pt", ".pth", ".h5", ".onnx", ".pkl"]:
                            model_file = os.path.join(model_dir, f"model{ext}")
                            if os.path.exists(model_file):
                                settings.model_path = model_file
                                break

        # Load model from local path (either downloaded from GCS or already local)
        if settings.model_path and os.path.exists(settings.model_path):
            logger.info(f"Loading model from: {settings.model_path}")
            predict.model_loader.load_model(settings.model_path)
            logger.info(f"Model loaded successfully!")
        else:
            logger.warning(f"Model path not found: {settings.model_path}. Skipping model loading.")

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        logger.warning("API will start without a loaded model.")

    yield

    # Cleanup on shutdown
    logger.info("Shutting down AIForge Model API...")


# Create FastAPI app
app = FastAPI(
    title="AIForge Model Inference API",
    description="Scalable AI model deployment and inference API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(predict_router, tags=["Inference"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AIForge Model Inference API",
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
    )
