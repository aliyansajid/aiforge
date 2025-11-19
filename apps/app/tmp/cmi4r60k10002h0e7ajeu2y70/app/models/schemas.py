from pydantic import BaseModel, Field
from typing import Any, Optional, Dict, List


class PredictRequest(BaseModel):
    """Request schema for model prediction."""

    input: Any = Field(..., description="Input data for the model")
    parameters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional model-specific parameters (e.g., temperature, top_k)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "input": [[5.1, 3.5, 1.4, 0.2]],
                "parameters": {"temperature": 0.7}
            }
        }


class PredictResponse(BaseModel):
    """Response schema for model prediction."""

    prediction: Any = Field(..., description="Model prediction output")
    model_id: Optional[str] = Field(None, description="Model identifier")
    framework: Optional[str] = Field(None, description="ML framework used")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "prediction": [0.9, 0.05, 0.05],
                "model_id": "iris-classifier-v1",
                "framework": "sklearn",
                "metadata": {"inference_time_ms": 12.5}
            }
        }


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether model is loaded")
    model_id: Optional[str] = Field(None, description="Loaded model ID")
    framework: Optional[str] = Field(None, description="ML framework")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "model_loaded": True,
                "model_id": "my-model-v1",
                "framework": "pytorch"
            }
        }


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    code: Optional[str] = Field(None, description="Error code")
