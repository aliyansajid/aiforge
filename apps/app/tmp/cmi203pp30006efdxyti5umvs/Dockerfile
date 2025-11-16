FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ curl && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create models directory
RUN mkdir -p /app/models

# Copy model and API code
COPY simple_image_model.pkl /app/models/simple_image_model.pkl
COPY app /app/app

# Set environment variables
ENV PORT=8080
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1
ENV MODEL_PATH=/app/models/simple_image_model.pkl
ENV DOWNLOAD_MODEL_ON_STARTUP=false

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD uvicorn app.main:app --host ${HOST} --port ${PORT}
