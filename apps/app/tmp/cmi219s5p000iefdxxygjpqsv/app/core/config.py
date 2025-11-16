from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server
    port: int = 8080
    host: str = "0.0.0.0"
    environment: str = "development"

    # Google Cloud Configuration
    google_cloud_project: str = "aiforge-2026"
    google_application_credentials: str = "./service-account.json"
    gcs_bucket_models: str = "aiforge-models"
    gcs_bucket_build: str = "aiforge-build-sources"
    artifact_registry_repo: str = "asia-south1-docker.pkg.dev/aiforge-2026/aiforge-models-repo"
    cloud_run_region: str = "asia-south1"

    # Model Configuration
    model_id: str = ""
    model_path: str = ""
    download_model_on_startup: bool = True

    # API Security
    api_key: str = "dev-api-key-change-in-production"
    enable_api_key_auth: bool = True

    # Rate Limiting
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
