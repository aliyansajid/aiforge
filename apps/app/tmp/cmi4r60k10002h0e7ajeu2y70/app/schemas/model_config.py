"""
Model Configuration Schema

Defines the structure for model_config.json that users must include in their ZIP deployments.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Literal, Optional, Dict, Any
from enum import Enum


class EntryPointType(str, Enum):
    """Type of entry point"""
    MODULE = "module"  # Python module with functions
    CLASS = "class"    # Python class with methods


class FunctionConfig(BaseModel):
    """Configuration for a function/method"""
    name: str = Field(..., description="Name of the function/method")
    args: List[str] = Field(default_factory=list, description="Argument names in order")

    @validator('args')
    def validate_args(cls, v):
        # Known argument types that platform can provide
        valid_args = ['model_path', 'model_dir', 'input_data', 'model']
        for arg in v:
            if arg not in valid_args:
                raise ValueError(
                    f"Invalid argument '{arg}'. "
                    f"Must be one of: {', '.join(valid_args)}"
                )
        return v


class ModelConfig(BaseModel):
    """
    Configuration file for ZIP model deployments.

    This file tells the platform exactly how to load and use your model.
    """

    # Model metadata
    name: str = Field(..., description="Human-readable model name")
    version: str = Field(..., description="Model version (semver recommended)")
    framework: Literal["sklearn", "pytorch", "tensorflow", "onnx", "custom"] = Field(
        ...,
        description="ML framework used"
    )

    # Entry point configuration
    entry_point: str = Field(..., description="Path to Python file (e.g., 'inference.py')")
    entry_point_type: EntryPointType = Field(
        default=EntryPointType.MODULE,
        description="Whether entry point is a module with functions or a class"
    )

    # For class-based entry points
    class_name: Optional[str] = Field(
        None,
        description="Class name if entry_point_type is 'class'"
    )

    # Load configuration
    load: FunctionConfig = Field(
        ...,
        description="Configuration for load function"
    )

    # Predict configuration
    predict: FunctionConfig = Field(
        ...,
        description="Configuration for predict function"
    )

    # Model file information
    model_file: str = Field(
        ...,
        description="Main model file name (e.g., 'model.pkl')"
    )

    # Optional auxiliary files
    auxiliary_files: Optional[List[str]] = Field(
        default=None,
        description="Other required files (e.g., ['vectorizer.pkl', 'config.json'])"
    )

    # Optional metadata
    description: Optional[str] = Field(None, description="Model description")
    author: Optional[str] = Field(None, description="Model author")
    tags: Optional[List[str]] = Field(default=None, description="Model tags")

    @validator('entry_point')
    def validate_entry_point(cls, v):
        if not v.endswith('.py'):
            raise ValueError("entry_point must be a Python file (.py)")
        return v

    @validator('class_name')
    def validate_class_name(cls, v, values):
        if values.get('entry_point_type') == EntryPointType.CLASS and not v:
            raise ValueError("class_name is required when entry_point_type is 'class'")
        return v


class ModelConfigValidator:
    """Validates model_config.json against schema"""

    @staticmethod
    def validate_file(config_path: str) -> ModelConfig:
        """
        Validate model_config.json file

        Args:
            config_path: Path to model_config.json

        Returns:
            Validated ModelConfig object

        Raises:
            ValueError: If validation fails
        """
        import json

        try:
            with open(config_path, 'r') as f:
                data = json.load(f)

            config = ModelConfig(**data)
            return config

        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in model_config.json: {e}")
        except Exception as e:
            raise ValueError(f"Invalid model_config.json: {e}")

    @staticmethod
    def create_template(output_path: str):
        """Create a template model_config.json file"""
        template = {
            "name": "My Model",
            "version": "1.0.0",
            "framework": "sklearn",
            "entry_point": "inference.py",
            "entry_point_type": "module",
            "load": {
                "name": "load_model",
                "args": ["model_path"]
            },
            "predict": {
                "name": "predict",
                "args": ["input_data"]
            },
            "model_file": "model.pkl",
            "description": "Model description here",
            "author": "Your Name",
            "tags": ["classification", "text"]
        }

        import json
        with open(output_path, 'w') as f:
            json.dump(template, f, indent=2)
