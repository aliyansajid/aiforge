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
        model_path = settings.model_path

        # If MODEL_PATH not set or doesn't exist, try to find model in /app/user_model
        if not model_path or not os.path.exists(model_path):
            logger.info(f"MODEL_PATH not set or not found ({model_path}), searching /app/user_model...")

            # List what's actually in /app/user_model
            try:
                if os.path.exists("/app/user_model"):
                    all_files = []
                    for root, dirs, files in os.walk("/app/user_model"):
                        for file in files:
                            all_files.append(os.path.join(root, file))
                    logger.info(f"Files in /app/user_model: {all_files}")
                else:
                    logger.warning("/app/user_model directory does not exist!")
            except Exception as e:
                logger.error(f"Error listing /app/user_model: {e}")

            # Search for model files
            import glob
            model_extensions = [".pkl", ".pt", ".pth", ".h5", ".onnx", ".joblib", ".keras"]
            found_model = None

            for ext in model_extensions:
                matches = glob.glob(f"/app/user_model/**/*{ext}", recursive=True)
                if matches:
                    found_model = matches[0]
                    logger.info(f"Found model: {found_model}")
                    break

            if found_model:
                model_path = found_model
            else:
                logger.warning("No model file found in /app/user_model")

        if model_path and os.path.exists(model_path):
            logger.info(f"Loading model from: {model_path}")
            logger.info(f"Model file size: {os.path.getsize(model_path)} bytes")

            # Check for custom inference script
            custom_inference = None
            if settings.custom_inference_path and os.path.exists(settings.custom_inference_path):
                logger.info(f"Using custom inference script: {settings.custom_inference_path}")
                custom_inference = settings.custom_inference_path
            else:
                # Try to find inference.py in user_model directory
                import glob
                inference_matches = glob.glob("/app/user_model/**/inference.py", recursive=True)
                if inference_matches:
                    custom_inference = inference_matches[0]
                    logger.info(f"Found custom inference script: {custom_inference}")

            logger.info(f"Calling load_model with path={model_path}, custom_inference={custom_inference}")
            predict.model_loader.load_model(
                model_path,
                custom_inference_path=custom_inference
            )

            # Verify model was actually loaded
            if predict.model_loader.model is None:
                raise ValueError("Model object is None after load_model() call!")

            logger.info(f"✅ Model loaded successfully!")
            logger.info(f"   Framework: {predict.model_loader.framework}")
            logger.info(f"   Model type: {type(predict.model_loader.model)}")
        else:
            logger.warning(f"Model path not found: {model_path}. Skipping model loading.")

    except Exception as e:
        import traceback
        logger.error(f"❌ Failed to load model: {e}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
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
