import os
import logging
from pathlib import Path
from typing import Optional
from google.cloud import storage
from google.auth.exceptions import DefaultCredentialsError

logger = logging.getLogger(__name__)


class GCSClient:
    """Google Cloud Storage client for model files."""

    def __init__(self, bucket_name: str, credentials_path: Optional[str] = None):
        """
        Initialize GCS client.

        Args:
            bucket_name: GCS bucket name
            credentials_path: Path to service account JSON (optional)
        """
        self.bucket_name = bucket_name

        try:
            if credentials_path and os.path.exists(credentials_path):
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

            self.client = storage.Client()
            self.bucket = self.client.bucket(bucket_name)
            logger.info(f"Connected to GCS bucket: {bucket_name}")
        except DefaultCredentialsError:
            logger.warning("No GCS credentials found. GCS features disabled.")
            self.client = None
            self.bucket = None

    def download_file(self, blob_path: str, destination_path: str) -> bool:
        """
        Download file from GCS.

        Args:
            blob_path: Path in GCS bucket (e.g., "user123/model456/model.pt")
            destination_path: Local file path to save

        Returns:
            True if successful, False otherwise
        """
        if not self.bucket:
            logger.error("GCS client not initialized")
            return False

        try:
            # Create directory if it doesn't exist
            Path(destination_path).parent.mkdir(parents=True, exist_ok=True)

            blob = self.bucket.blob(blob_path)
            blob.download_to_filename(destination_path)
            logger.info(f"Downloaded {blob_path} to {destination_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to download {blob_path}: {e}")
            return False

    def upload_file(self, file_path: str, blob_path: str) -> bool:
        """
        Upload file to GCS.

        Args:
            file_path: Local file path
            blob_path: Path in GCS bucket

        Returns:
            True if successful, False otherwise
        """
        if not self.bucket:
            logger.error("GCS client not initialized")
            return False

        try:
            blob = self.bucket.blob(blob_path)
            blob.upload_from_filename(file_path)
            logger.info(f"Uploaded {file_path} to {blob_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload {file_path}: {e}")
            return False

    def download_model_files(self, model_id: str, user_id: str, local_dir: str = "/tmp/models") -> Optional[str]:
        """
        Download all model files for a given model.

        Args:
            model_id: Model identifier
            user_id: User identifier
            local_dir: Local directory to store model

        Returns:
            Path to downloaded model directory or None if failed
        """
        model_dir = Path(local_dir) / user_id / model_id
        model_dir.mkdir(parents=True, exist_ok=True)

        # Common model file patterns
        model_files = [
            "model.pt", "model.pth",  # PyTorch
            "model.h5", "saved_model.pb",  # TensorFlow
            "model.onnx",  # ONNX
            "model.pkl",  # Scikit-learn
            "config.json", "metadata.json",  # Config files
        ]

        downloaded_any = False
        for filename in model_files:
            blob_path = f"{user_id}/{model_id}/{filename}"
            local_path = model_dir / filename

            if self.download_file(blob_path, str(local_path)):
                downloaded_any = True

        return str(model_dir) if downloaded_any else None
