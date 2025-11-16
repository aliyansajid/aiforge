import os
import logging
from pathlib import Path
from typing import Any, Optional, Dict
import importlib.util

logger = logging.getLogger(__name__)


class ModelLoader:
    """
    Generic model loader supporting multiple ML frameworks.

    Supports:
    - PyTorch (.pt, .pth)
    - TensorFlow (.h5, SavedModel)
    - ONNX (.onnx)
    - Scikit-learn (.pkl)
    """

    def __init__(self):
        self.model = None
        self.framework = None
        self.model_path = None

    def load_model(self, model_path: str, framework: Optional[str] = None) -> Any:
        """
        Load model from file. Auto-detects framework if not specified.

        Args:
            model_path: Path to model file or directory
            framework: Optional framework hint ("pytorch", "tensorflow", "onnx", "sklearn")

        Returns:
            Loaded model object
        """
        self.model_path = model_path

        # Auto-detect framework from file extension
        if framework is None:
            framework = self._detect_framework(model_path)

        self.framework = framework
        logger.info(f"Loading {framework} model from {model_path}")

        # Load based on framework
        if framework == "pytorch":
            self.model = self._load_pytorch(model_path)
        elif framework == "tensorflow":
            self.model = self._load_tensorflow(model_path)
        elif framework == "onnx":
            self.model = self._load_onnx(model_path)
        elif framework == "sklearn":
            self.model = self._load_sklearn(model_path)
        else:
            raise ValueError(f"Unsupported framework: {framework}")

        logger.info(f"Model loaded successfully: {framework}")
        return self.model

    def _detect_framework(self, model_path: str) -> str:
        """Detect ML framework from file extension."""
        ext = Path(model_path).suffix.lower()

        if ext in [".pt", ".pth"]:
            return "pytorch"
        elif ext in [".h5"]:
            return "tensorflow"
        elif ext == ".onnx":
            return "onnx"
        elif ext == ".pkl":
            return "sklearn"
        elif os.path.isdir(model_path):
            # Check for TensorFlow SavedModel
            if os.path.exists(os.path.join(model_path, "saved_model.pb")):
                return "tensorflow"

        raise ValueError(f"Could not detect framework for: {model_path}")

    def _load_pytorch(self, model_path: str) -> Any:
        """Load PyTorch model."""
        try:
            import torch

            # Load model (CPU only for now)
            model = torch.load(model_path, map_location=torch.device("cpu"))

            # If it's a state dict, you'll need the model architecture
            if isinstance(model, dict):
                logger.warning("Loaded state_dict. You may need to provide model architecture.")

            return model
        except ImportError:
            raise ImportError("PyTorch not installed. Add 'torch' to requirements.txt")

    def _load_tensorflow(self, model_path: str) -> Any:
        """Load TensorFlow model."""
        try:
            import tensorflow as tf

            # Load Keras model or SavedModel
            if model_path.endswith(".h5"):
                model = tf.keras.models.load_model(model_path)
            else:
                model = tf.saved_model.load(model_path)

            return model
        except ImportError:
            raise ImportError("TensorFlow not installed. Add 'tensorflow' to requirements.txt")

    def _load_onnx(self, model_path: str) -> Any:
        """Load ONNX model."""
        try:
            import onnxruntime as ort

            # Create inference session
            session = ort.InferenceSession(model_path)
            return session
        except ImportError:
            raise ImportError("ONNX Runtime not installed. Add 'onnxruntime' to requirements.txt")

    def _load_sklearn(self, model_path: str) -> Any:
        """Load scikit-learn model."""
        try:
            import pickle

            with open(model_path, "rb") as f:
                model = pickle.load(f)

            return model
        except Exception as e:
            raise ValueError(f"Failed to load sklearn model: {e}")

    def predict(self, input_data: Any) -> Any:
        """
        Run inference on input data.

        Args:
            input_data: Input data (format depends on model)

        Returns:
            Model predictions
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")

        # Framework-specific inference
        if self.framework == "pytorch":
            return self._predict_pytorch(input_data)
        elif self.framework == "tensorflow":
            return self._predict_tensorflow(input_data)
        elif self.framework == "onnx":
            return self._predict_onnx(input_data)
        elif self.framework == "sklearn":
            return self._predict_sklearn(input_data)

    def _predict_pytorch(self, input_data: Any) -> Any:
        """PyTorch inference."""
        import torch

        self.model.eval()
        with torch.no_grad():
            if isinstance(input_data, torch.Tensor):
                output = self.model(input_data)
            else:
                # Convert to tensor if needed
                input_tensor = torch.tensor(input_data)
                output = self.model(input_tensor)

        return output

    def _predict_tensorflow(self, input_data: Any) -> Any:
        """TensorFlow inference."""
        import tensorflow as tf

        if not isinstance(input_data, tf.Tensor):
            input_data = tf.convert_to_tensor(input_data)

        output = self.model(input_data)
        return output

    def _predict_onnx(self, input_data: Any) -> Any:
        """ONNX inference."""
        import numpy as np

        # Get input name
        input_name = self.model.get_inputs()[0].name

        # Ensure input is numpy array
        if not isinstance(input_data, np.ndarray):
            input_data = np.array(input_data)

        # Run inference
        output = self.model.run(None, {input_name: input_data})
        return output[0]

    def _predict_sklearn(self, input_data: Any) -> Any:
        """Scikit-learn inference."""
        import numpy as np

        if not isinstance(input_data, np.ndarray):
            input_data = np.array(input_data)

        return self.model.predict(input_data)
