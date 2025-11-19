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

            # First, try to find a file specifically named "model.*"
            found_model = None
            model_extensions = [".pkl", ".pt", ".pth", ".h5", ".onnx", ".joblib", ".keras"]

            for ext in model_extensions:
                model_path_direct = f"/app/user_model/model{ext}"
                if os.path.exists(model_path_direct):
                    found_model = model_path_direct
                    logger.info(f"Found model file by name: {found_model}")
                    break

            # If not found, search recursively (but skip auxiliary files)
            if not found_model:
                for ext in model_extensions:
                    matches = glob.glob(f"/app/user_model/**/*{ext}", recursive=True)
                    # Filter out known auxiliary files
                    matches = [m for m in matches if not any(x in os.path.basename(m) for x in ['label_encoder', 'vectorizer', 'scaler', 'tokenizer', 'encoder'])]
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

            # Check for custom inference script (optional - auto-detection will try common patterns)
            custom_inference = None
            if settings.custom_inference_path and os.path.exists(settings.custom_inference_path):
                logger.info(f"Using custom inference script: {settings.custom_inference_path}")
                custom_inference = settings.custom_inference_path

            # Determine model directory for auto-detection
            model_dir = "/app/user_model" if os.path.exists("/app/user_model") else os.path.dirname(model_path)

            logger.info(f"Calling load_model with:")
            logger.info(f"  - model_path: {model_path}")
            logger.info(f"  - model_dir: {model_dir}")
            logger.info(f"  - custom_inference: {custom_inference or 'auto-detect'}")

            predict.model_loader.load_model(
                model_path,
                custom_inference_path=custom_inference,
                model_dir=model_dir
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

        # For ZIP/Git deployments, log error but allow startup so Cloud Run doesn't kill the container
        # The /health endpoint will report "initializing" status
        if not settings.download_model_on_startup:
            logger.error("Model loading failed for baked-in deployment. Service will start but model is unavailable.")
            logger.error("Check logs for details. The /debug endpoint may provide more information.")
        else:
            logger.warning("API will start without a loaded model (GCS download mode).")

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
