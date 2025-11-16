#!/bin/bash

# AIForge Model Deployment Script for Google Cloud Run
# Usage: ./scripts/deploy.sh <model_id> <user_id> <project_id>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -ne 3 ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: ./scripts/deploy.sh <model_id> <user_id> <project_id>"
    echo "Example: ./scripts/deploy.sh my-model-v1 user123 aiforge-production"
    exit 1
fi

MODEL_ID=$1
USER_ID=$2
PROJECT_ID=${3:-aiforge-2026}
REGION=${REGION:-asia-south1}
BUCKET_NAME=${BUCKET_NAME:-aiforge-models}
ARTIFACT_REGISTRY=${ARTIFACT_REGISTRY:-asia-south1-docker.pkg.dev/aiforge-2026/aiforge-models-repo}

echo -e "${GREEN}Starting deployment for model: ${MODEL_ID}${NC}"
echo "User ID: ${USER_ID}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"

# Generate API key
API_KEY=$(openssl rand -hex 32)
echo -e "${YELLOW}Generated API Key: ${API_KEY}${NC}"
echo -e "${YELLOW}Save this key! It won't be shown again.${NC}"

# Image name
IMAGE_NAME="${ARTIFACT_REGISTRY}/${MODEL_ID}:v1"

echo -e "\n${GREEN}Step 1: Building Docker image...${NC}"
docker build -t ${IMAGE_NAME} .

echo -e "\n${GREEN}Step 2: Pushing image to Artifact Registry...${NC}"
docker push ${IMAGE_NAME}

echo -e "\n${GREEN}Step 3: Deploying to Cloud Run...${NC}"
gcloud run deploy ${MODEL_ID} \
  --image=${IMAGE_NAME} \
  --platform=managed \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --allow-unauthenticated \
  --set-env-vars="MODEL_ID=${USER_ID}/${MODEL_ID}" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --set-env-vars="GCS_BUCKET_MODELS=${BUCKET_NAME}" \
  --set-env-vars="CLOUD_RUN_REGION=${REGION}" \
  --set-env-vars="API_KEY=${API_KEY}" \
  --set-env-vars="DOWNLOAD_MODEL_ON_STARTUP=true" \
  --set-env-vars="ENABLE_API_KEY_AUTH=true" \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300

# Get service URL
SERVICE_URL=$(gcloud run services describe ${MODEL_ID} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format='value(status.url)')

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Service URL: ${SERVICE_URL}"
echo -e "API Key: ${API_KEY}"
echo -e "\nTest your deployment:"
echo -e "curl ${SERVICE_URL}/health"
echo -e "\nTest prediction:"
echo -e "curl -X POST ${SERVICE_URL}/predict \\"
echo -e "  -H 'Content-Type: application/json' \\"
echo -e "  -H 'X-API-Key: ${API_KEY}' \\"
echo -e "  -d '{\"input\": [[1, 2, 3, 4]]}'"
echo -e "${GREEN}========================================${NC}"
