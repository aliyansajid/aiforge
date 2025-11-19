import os
import logging
import json
from pathlib import Path
from typing import Any, Optional, Dict
import importlib.util

logger = logging.getLogger(__name__)

try:
    from app.schemas.model_config import ModelConfig, ModelConfigValidator
except ImportError:
    # Fallback if schema not available
    ModelConfig = None
    ModelConfigValidator = None


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
        self.model_config = None  # Loaded from model_config.json

    def load_model(self, model_path: str, framework: Optional[str] = None, custom_inference_path: Optional[str] = None, model_dir: Optional[str] = None) -> Any:
        """
        Load model from file. Auto-detects framework if not specified.

        Args:
            model_path: Path to model file or directory
            framework: Optional framework hint ("pytorch", "tensorflow", "onnx", "sklearn")
            custom_inference_path: Optional path to custom inference.py
            model_dir: Optional directory containing user's model package (for ZIP deployments)

        Returns:
            Loaded model object
        """
        self.model_path = model_path

        # Priority 1: Check for model_config.json (config-driven approach)
        if model_dir and os.path.exists(model_dir):
            config_path = os.path.join(model_dir, "model_config.json")
            if os.path.exists(config_path):
                logger.info(f"Found model_config.json, using config-based loading")
                return self._load_from_config(config_path, model_dir)

        # Priority 2: Explicit custom inference path provided
        if custom_inference_path and os.path.exists(custom_inference_path):
            logger.info(f"Loading custom inference script from {custom_inference_path}")
            self.custom_inference = self._load_custom_inference(custom_inference_path)
            self.use_custom_inference = True

            # Try to load model using custom script's load function
            load_success = self._try_custom_load(model_path, model_dir)
            if load_success:
                self.framework = "custom"
                logger.info("Model loaded using custom inference script")
                return self.model
            else:
                logger.warning("Custom inference script found but couldn't load model. Falling back to default loading.")
                self.use_custom_inference = False

        # Priority 3: For ZIP deployments, auto-detect (fallback - not recommended)
        elif model_dir and os.path.exists(model_dir):
            logger.warning("No model_config.json found. Using auto-detection (not recommended).")
            logger.warning("Please include model_config.json in your ZIP for reliable deployment.")
            custom_loaded = self._try_auto_detect_custom_inference(model_dir, model_path)
            if custom_loaded:
                self.framework = "custom"
                logger.info("Model loaded using auto-detected custom inference")
                return self.model

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

    def _load_from_config(self, config_path: str, model_dir: str) -> Any:
        """
        Load model using model_config.json specification.
        This is the recommended approach for ZIP deployments.

        Args:
            config_path: Path to model_config.json
            model_dir: Directory containing model files

        Returns:
            Loaded model object
        """
        logger.info("=" * 60)
        logger.info("LOADING MODEL FROM CONFIG")
        logger.info("=" * 60)

        # Parse and validate config
        try:
            with open(config_path, 'r') as f:
                config_data = json.load(f)

            logger.info(f"Config loaded: {json.dumps(config_data, indent=2)}")

            # Validate if schema available
            if ModelConfigValidator:
                self.model_config = ModelConfigValidator.validate_file(config_path)
                logger.info("✅ Config validation passed")
            else:
                # Basic validation without pydantic
                required = ['entry_point', 'load', 'predict', 'model_file']
                missing = [field for field in required if field not in config_data]
                if missing:
                    raise ValueError(
                        f"model_config.json missing required fields: {', '.join(missing)}\n\n"
                        f"Required fields:\n"
                        f"  • entry_point: Your Python file (e.g., 'inference.py')\n"
                        f"  • load: {{name: 'function_name', args: ['model_path']}}\n"
                        f"  • predict: {{name: 'function_name', args: ['data']}}\n"
                        f"  • model_file: Your model file (e.g., 'model.pkl')\n"
                        f"  • framework: 'sklearn'|'pytorch'|'tensorflow'|'onnx'|'custom'"
                    )
                self.model_config = config_data

        except json.JSONDecodeError as e:
            logger.error(f"❌ model_config.json contains invalid JSON: {e}")
            raise ValueError(
                f"Invalid JSON in model_config.json: {e}\n\n"
                f"Make sure your JSON is properly formatted:\n"
                f"  • All strings in double quotes\n"
                f"  • No trailing commas\n"
                f"  • Proper nesting of braces\n\n"
                f"Use a JSON validator to check your file."
            )
        except FileNotFoundError:
            logger.error(f"❌ model_config.json not found: {config_path}")
            raise ValueError(
                f"model_config.json not found at: {config_path}\n\n"
                f"For ZIP deployments, model_config.json is REQUIRED at the root.\n"
                f"Make sure it's included in your ZIP archive."
            )
        except Exception as e:
            logger.error(f"❌ Failed to load model_config.json: {e}")
            raise ValueError(f"Invalid model_config.json: {e}")

        # Load entry point module
        entry_point_path = os.path.join(model_dir, config_data['entry_point'])
        if not os.path.exists(entry_point_path):
            logger.error(f"❌ Entry point not found: {entry_point_path}")
            raise FileNotFoundError(
                f"Entry point file not found: {config_data['entry_point']}\n\n"
                f"Expected location: {entry_point_path}\n\n"
                f"Make sure:\n"
                f"  • The file exists in your ZIP\n"
                f"  • The path in model_config.json is correct\n"
                f"  • The path is relative to ZIP root (not absolute)"
            )

        logger.info(f"Loading entry point: {entry_point_path}")
        try:
            self.custom_inference = self._load_custom_inference(entry_point_path)
            self.use_custom_inference = True
        except Exception as e:
            logger.error(f"❌ Failed to load entry point: {e}")
            raise ImportError(
                f"Failed to import {config_data['entry_point']}: {e}\n\n"
                f"Common issues:\n"
                f"  • Missing dependencies (check requirements.txt)\n"
                f"  • Syntax errors in Python file\n"
                f"  • Imports that can't be resolved\n\n"
                f"Check the build logs for details."
            )

        # Get load function configuration
        load_config = config_data['load']
        load_func_name = load_config.get('name') or load_config.get('function')
        load_args = load_config.get('args', [])

        logger.info(f"Load function: {load_func_name}({', '.join(load_args)})")

        # Get the load function
        if not hasattr(self.custom_inference, load_func_name):
            available_funcs = [name for name in dir(self.custom_inference) if not name.startswith('_')]
            logger.error(f"❌ Function '{load_func_name}' not found in {config_data['entry_point']}")
            raise AttributeError(
                f"Function '{load_func_name}' not found in {config_data['entry_point']}\n\n"
                f"Available functions: {', '.join(available_funcs)}\n\n"
                f"Make sure:\n"
                f"  • The function name in model_config.json matches your code\n"
                f"  • The function is defined at module level (not inside a class)\n"
                f"  • There are no typos"
            )

        load_func = getattr(self.custom_inference, load_func_name)

        # Prepare arguments based on config
        model_file_path = os.path.join(model_dir, config_data['model_file'])
        kwargs = {}

        for arg in load_args:
            if arg == 'model_path':
                kwargs['model_path'] = model_file_path
            elif arg == 'model_dir':
                kwargs['model_dir'] = model_dir
            else:
                logger.warning(f"Unknown argument '{arg}' in load config, skipping")

        # Call load function
        logger.info(f"Calling {load_func_name} with args: {list(kwargs.keys())}")
        try:
            self.model = load_func(**kwargs)
            self.framework = config_data.get('framework', 'custom')
            logger.info(f"✅ Model loaded successfully using config-based loading")
            logger.info(f"   Framework: {self.framework}")
            logger.info(f"   Model type: {type(self.model)}")
            logger.info("=" * 60)
            return self.model
        except Exception as e:
            logger.error(f"❌ Failed to call {load_func_name}: {e}")
            raise

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

    def _try_custom_load(self, model_path: str, model_dir: Optional[str] = None) -> bool:
        """
        Try to load model using custom inference script.
        Supports multiple function name conventions.

        Returns:
            True if successfully loaded, False otherwise
        """
        if not self.custom_inference:
            return False

        # Try common load function names
        load_functions = ['load_model', 'load', 'initialize', 'init', 'setup']

        for func_name in load_functions:
            if hasattr(self.custom_inference, func_name):
                try:
                    func = getattr(self.custom_inference, func_name)
                    logger.info(f"Trying custom load function: {func_name}")

                    # Try calling with different argument patterns
                    import inspect
                    sig = inspect.signature(func)
                    params = list(sig.parameters.keys())

                    if len(params) == 0:
                        # No arguments - load function handles everything internally
                        self.model = func()
                    elif len(params) == 1:
                        # Single argument - pass model_path
                        self.model = func(model_path)
                    elif len(params) == 2:
                        # Two arguments - pass model_path and model_dir
                        self.model = func(model_path, model_dir or os.path.dirname(model_path))
                    else:
                        # More complex - try with model_path only
                        self.model = func(model_path)

                    if self.model is not None:
                        logger.info(f"✅ Model loaded successfully using {func_name}()")
                        return True
                except Exception as e:
                    logger.warning(f"Failed to load using {func_name}: {e}")
                    continue

        return False

    def _try_auto_detect_custom_inference(self, model_dir: str, model_path: str) -> bool:
        """
        Auto-detect and load custom inference from model directory.
        Tries multiple common patterns and filenames.

        Returns:
            True if successfully loaded, False otherwise
        """
        import json

        # 1. Check for model_config.json
        config_path = os.path.join(model_dir, "model_config.json")
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)

                entry_point = config.get('entry_point', 'inference.py')
                inference_path = os.path.join(model_dir, entry_point)

                if os.path.exists(inference_path):
                    logger.info(f"Found model_config.json, loading entry point: {entry_point}")
                    self.custom_inference = self._load_custom_inference(inference_path)
                    self.use_custom_inference = True

                    # Try to load with config-specified function names
                    load_func_name = config.get('load_function', 'load_model')
                    if hasattr(self.custom_inference, load_func_name):
                        func = getattr(self.custom_inference, load_func_name)
                        self.model = func(model_path)
                        logger.info(f"✅ Model loaded using config-specified function: {load_func_name}()")
                        return True
            except Exception as e:
                logger.warning(f"Failed to load using model_config.json: {e}")

        # 2. Try common inference file names
        inference_files = [
            'inference.py',
            'predict.py',
            'model.py',
            'handler.py',
            'main.py'
        ]

        for filename in inference_files:
            inference_path = os.path.join(model_dir, filename)
            if os.path.exists(inference_path):
                try:
                    logger.info(f"Found {filename}, attempting to load...")
                    self.custom_inference = self._load_custom_inference(inference_path)
                    self.use_custom_inference = True

                    # Try to load model
                    if self._try_custom_load(model_path, model_dir):
                        logger.info(f"✅ Successfully loaded using {filename}")
                        return True
                except Exception as e:
                    logger.warning(f"Failed to load using {filename}: {e}")
                    continue

        logger.info("No custom inference detected, will use default framework loading")
        return False

    def _try_custom_predict(self, input_data: Any) -> Any:
        """
        Try to call custom predict function with flexible signature support.
        Uses model_config.json if available, otherwise tries common patterns.
        """
        # If config is available, use it (reliable and fast)
        if self.model_config and isinstance(self.model_config, dict):
            return self._predict_from_config(input_data)

        # Fallback: Try common predict function names (not recommended)
        logger.warning("Using fallback predict method. Consider adding model_config.json")
        predict_functions = ['predict', 'inference', 'run', 'forward', '__call__']

        for func_name in predict_functions:
            if hasattr(self.custom_inference, func_name):
                try:
                    func = getattr(self.custom_inference, func_name)
                    logger.info(f"Using custom predict function: {func_name}")

                    # Check function signature
                    import inspect
                    sig = inspect.signature(func)
                    params = list(sig.parameters.keys())

                    logger.info(f"Function {func_name} has parameters: {params}")

                    # Try different calling patterns
                    if len(params) == 0:
                        # No arguments - function handles everything internally
                        return func()
                    elif len(params) == 1:
                        # Single argument - pass input_data only (most common for user code)
                        return func(input_data)
                    elif len(params) >= 2:
                        # Multiple arguments - pass model and input_data
                        return func(self.model, input_data)

                except TypeError as e:
                    # Signature inspection might fail for some functions, try calling anyway
                    logger.warning(f"Signature check failed for {func_name}, trying direct call: {e}")
                    try:
                        # Try with input_data only first (most common)
                        return func(input_data)
                    except TypeError:
                        # Try with model and input_data
                        try:
                            return func(self.model, input_data)
                        except Exception as e2:
                            logger.warning(f"Failed to call {func_name}: {e2}")
                            continue
                except Exception as e:
                    logger.warning(f"Failed to use {func_name}: {e}")
                    continue

        raise ValueError("Custom inference loaded but no compatible predict function found. "
                        "Tried: predict(), inference(), run(), forward(), __call__()")

    def _predict_from_config(self, input_data: Any) -> Any:
        """
        Call predict function using model_config.json specification.
        This is the reliable, config-driven approach.
        """
        predict_config = self.model_config['predict']
        predict_func_name = predict_config.get('name') or predict_config.get('function')
        predict_args = predict_config.get('args', [])

        logger.info(f"Using config-based predict: {predict_func_name}({', '.join(predict_args)})")

        # Get the predict function
        if not hasattr(self.custom_inference, predict_func_name):
            raise AttributeError(f"Function '{predict_func_name}' not found in entry point")

        predict_func = getattr(self.custom_inference, predict_func_name)

        # Prepare arguments based on config
        kwargs = {}
        for arg in predict_args:
            if arg == 'input_data':
                kwargs['input_data'] = input_data
            elif arg == 'model':
                kwargs['model'] = self.model
            elif arg == 'data':
                # Alias for input_data
                kwargs['data'] = input_data
            else:
                logger.warning(f"Unknown argument '{arg}' in predict config, skipping")

        # Call predict function
        try:
            result = predict_func(**kwargs)
            logger.info(f"✅ Prediction completed using config-based method")
            return result
        except Exception as e:
            logger.error(f"❌ Prediction failed: {e}")
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
        if self.use_custom_inference and self.custom_inference:
            return self._try_custom_predict(input_data)

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
