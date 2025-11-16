from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.core.config import get_settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Verify API key for model access.

    This is a simple implementation for MVP. Later, we can:
    1. Validate against database (model-specific keys)
    2. Track usage per key for billing
    3. Implement different access levels (free/paid)
    """
    settings = get_settings()

    # Skip auth if disabled (for testing)
    if not settings.enable_api_key_auth:
        return "anonymous"

    # Verify API key
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Please provide X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key",
        )

    return api_key


# Optional: Rate limiting dependency (future implementation)
async def check_rate_limit(api_key: str = Security(verify_api_key)):
    """
    Check rate limits for API key.
    TODO: Implement with Redis or in-memory cache
    """
    # For now, just pass through
    # Later: Track requests per key and enforce limits
    return True
