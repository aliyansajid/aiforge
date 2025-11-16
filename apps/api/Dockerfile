# ================================
# STAGE 1: Builder (Dependencies)
# ================================
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /build

# Install build dependencies (needed for some Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements FIRST (cache optimization - changes rarely)
COPY requirements.txt .

# Install Python dependencies to /install directory
# --user flag installs to /root/.local
# --no-cache-dir prevents pip from caching packages (saves space)
RUN pip install --no-cache-dir --user -r requirements.txt

# ================================
# STAGE 2: Runtime (Minimal)
# ================================
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy only the installed packages from builder stage
COPY --from=builder /root/.local /root/.local

# Add local bin to PATH
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY app /app/app

# Copy service account if it exists (optional)
COPY service-account.json /app/service-account.json* ./

# Environment variables (can be overridden at runtime)
ENV PORT=8080
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

# Create directory for downloaded models
RUN mkdir -p /tmp/models

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health', timeout=2)" || exit 1

# Run the application
CMD uvicorn app.main:app --host ${HOST} --port ${PORT}
