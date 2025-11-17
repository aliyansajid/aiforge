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
    - Custom inference scripts (inference.py)
    """

    def __init__(self):
        self.model = None
        self.framework = None
        self.model_path = None
        self.custom_inference = None
        self.use_custom_inference = False

    def load_model(self, model_path: str, framework: Optional[str] = None, custom_inference_path: Optional[str] = None) -> Any:
        """
        Load model from file. Auto-detects framework if not specified.

        Args:
            model_path: Path to model file or directory
            framework: Optional framework hint ("pytorch", "tensorflow", "onnx", "sklearn")
            custom_inference_path: Optional path to custom inference.py

        Returns:
            Loaded model object
        """
        self.model_path = model_path

        # Check for custom inference script
        if custom_inference_path and os.path.exists(custom_inference_path):
            logger.info(f"Loading custom inference script from {custom_inference_path}")
            self.custom_inference = self._load_custom_inference(custom_inference_path)
            self.use_custom_inference = True

            # Still load the model using custom script
            if hasattr(self.custom_inference, 'load_model'):
                self.model = self.custom_inference.load_model(model_path)
                self.framework = "custom"
                logger.info("Model loaded using custom inference script")
                return self.model
            else:
                logger.warning("Custom inference.py found but no load_model() function. Falling back to default loading.")
                self.use_custom_inference = False

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

    def _load_custom_inference(self, inference_path: str) -> Any:
        """Load custom inference.py module dynamically."""
        try:
            spec = importlib.util.spec_from_file_location("custom_inference", inference_path)
            if spec is None or spec.loader is None:
                raise ImportError(f"Could not load spec from {inference_path}")

            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module
        except Exception as e:
            logger.error(f"Failed to load custom inference script: {e}")
            raise

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

        # Use custom inference if available
        if self.use_custom_inference and hasattr(self.custom_inference, 'predict'):
            logger.info("Using custom predict() function")
            return self.custom_inference.predict(self.model, input_data)

        # Framework-specific inference
        if self.framework == "pytorch":
            return self._predict_pytorch(input_data)
        elif self.framework == "tensorflow":
            return self._predict_tensorflow(input_data)
        elif self.framework == "onnx":
            return self._predict_onnx(input_data)
        elif self.framework == "sklearn":
            return self._predict_sklearn(input_data)
        elif self.framework == "custom":
            # Custom framework but no custom predict - should not happen
            raise ValueError("Custom model loaded but no predict() function found in inference.py")

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

        # For single text string, wrap in list
        if isinstance(input_data, str):
            return self.model.predict([input_data])

        # For list of strings (text data), pass directly to model
        # Don't convert to numpy array as this breaks text pipelines
        elif isinstance(input_data, list) and len(input_data) > 0 and isinstance(input_data[0], str):
            return self.model.predict(input_data)

        # For nested list of strings [[text1], [text2]], flatten first
        elif isinstance(input_data, list) and len(input_data) > 0 and isinstance(input_data[0], list):
            # Check if it's a list of text arrays
            if len(input_data[0]) > 0 and isinstance(input_data[0][0], str):
                # Flatten: [[text1], [text2]] -> [text1, text2]
                flattened = [item[0] if isinstance(item, list) and len(item) > 0 else item for item in input_data]
                return self.model.predict(flattened)

        # For numeric data, convert to numpy array
        if not isinstance(input_data, np.ndarray):
            input_data = np.array(input_data)

        return self.model.predict(input_data)
