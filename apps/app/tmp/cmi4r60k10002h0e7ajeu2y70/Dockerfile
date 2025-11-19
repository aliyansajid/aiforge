# ================================================
# OPTIMIZED MULTI-STAGE DOCKERFILE WITH CACHING
# Framework: sklearn
# Deployment: ZIP_ARCHIVE
# Generated: 2025-11-18T15:53:18.011Z
# ================================================

# ==========================================
# STAGE 1: Base Dependencies (CACHED LAYER)
# ==========================================
FROM python:3.11-slim AS base-deps

WORKDIR /app

# Install system dependencies (rarely changes - CACHED)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ================================================
# STAGE 2: Base FastAPI Dependencies (CACHED)
# ================================================
FROM base-deps AS fastapi-deps

# Install base FastAPI dependencies FIRST (rarely change - HEAVILY CACHED)
# These are installed BEFORE user requirements to maximize cache hits
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    pydantic==2.5.0 \
    pydantic-settings==2.1.0 \
    google-cloud-storage==2.14.0 \
    google-auth==2.25.2 \
    python-multipart==0.0.6 \
    aiofiles==23.2.1 \
    python-json-logger==2.0.7

# ================================================
# STAGE 3: User Dependencies (CACHED IF SAME)
# ================================================
FROM fastapi-deps AS user-deps

# Copy ONLY requirements.txt first (maximizes cache hit rate)
COPY requirements.txt /tmp/user-requirements.txt

# Install user's ML dependencies
# USER REQUIREMENTS CONTROL VERSIONS (installed after base FastAPI)
# This allows user to override numpy/sklearn/etc versions
RUN if [ -s /tmp/user-requirements.txt ]; then \
      echo "==================== INSTALLING USER REQUIREMENTS ====================" && \
      cat /tmp/user-requirements.txt && \
      echo "======================================================================" && \
      pip install --no-cache-dir -r /tmp/user-requirements.txt && \
      echo "✅ User requirements installed successfully"; \
    else \
      echo "No user requirements.txt provided, installing default sklearn dependencies" && \
      pip install --no-cache-dir scikit-learn>=1.3.2 joblib>=1.3.2 numpy>=1.24.0 && \
      echo "✅ Default sklearn dependencies installed"; \
    fi

# Verify framework installation
RUN python3 -c "import sklearn; print('✅ sklearn framework verified')" || \
    (echo "❌ sklearn framework not found! Check requirements.txt" && exit 1)

# ================================================
# STAGE 4: Final Runtime Image (LIGHTWEIGHT)
# ================================================
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy system dependencies from base
COPY --from=base-deps /usr/lib /usr/lib
COPY --from=base-deps /usr/bin /usr/bin

# Copy ALL Python packages from user-deps stage (includes FastAPI + user deps)
COPY --from=user-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=user-deps /usr/local/bin /usr/local/bin

# Copy FastAPI application code
COPY app/ /app/app/

# Copy user's model package (THIS LAYER CHANGES EVERY DEPLOYMENT)
# Placed LAST to avoid invalidating earlier cached layers
COPY model_package/ /app/user_model/

# Add user model to Python path
ENV PYTHONPATH="/app/user_model:${PYTHONPATH}"

# Runtime environment
ENV PORT=8080
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1
ENV GCS_BUCKET_NAME=aiforge-models
ENV DOWNLOAD_MODEL_ON_STARTUP=false
ENV BUILD_TIMESTAMP="1763481198011"

EXPOSE 8080

# Health check (optional - Cloud Run has its own)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health', timeout=5)" || exit 1

# Run with optimized settings
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--log-level", "info"]
