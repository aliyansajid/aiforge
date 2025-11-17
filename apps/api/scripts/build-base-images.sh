#!/bin/bash

# ================================
# Build and Push Base Docker Images
# ================================
# This script builds framework-specific base images to minimize
# deployment image sizes and speed up builds.
#
# Usage: ./build-base-images.sh [PROJECT_ID] [REGION]
# Example: ./build-base-images.sh my-project us-central1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
PROJECT_ID=${1:-"aiforge-448200"}
REGION=${2:-"us-central1"}
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/aiforge"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building AIForge Base Images${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Project ID: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo -e "Registry: ${YELLOW}${REGISTRY}${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Authenticate with Artifact Registry
echo -e "${YELLOW}Authenticating with Artifact Registry...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Change to API directory
cd "$(dirname "$0")/.."

# Build base image first (all others depend on it)
echo -e "\n${GREEN}[1/5] Building base image...${NC}"
docker build \
    --platform linux/amd64 \
    -f Dockerfile.base \
    -t ${REGISTRY}/base:latest \
    -t ${REGISTRY}/base:$(date +%Y%m%d) \
    .

echo -e "${GREEN}Pushing base image...${NC}"
docker push ${REGISTRY}/base:latest
docker push ${REGISTRY}/base:$(date +%Y%m%d)

# Build framework-specific images
FRAMEWORKS=("sklearn" "pytorch" "tensorflow" "onnx")
COUNT=2

for framework in "${FRAMEWORKS[@]}"; do
    echo -e "\n${GREEN}[${COUNT}/5] Building ${framework} image...${NC}"

    docker build \
        --platform linux/amd64 \
        --build-arg PROJECT_ID=${PROJECT_ID} \
        --build-arg REGION=${REGION} \
        -f Dockerfile.${framework} \
        -t ${REGISTRY}/base-${framework}:latest \
        -t ${REGISTRY}/base-${framework}:$(date +%Y%m%d) \
        .

    echo -e "${GREEN}Pushing ${framework} image...${NC}"
    docker push ${REGISTRY}/base-${framework}:latest
    docker push ${REGISTRY}/base-${framework}:$(date +%Y%m%d)

    ((COUNT++))
done

# Print summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Base images pushed to:"
echo -e "  ${YELLOW}${REGISTRY}/base:latest${NC}"
echo -e "  ${YELLOW}${REGISTRY}/base-sklearn:latest${NC}"
echo -e "  ${YELLOW}${REGISTRY}/base-pytorch:latest${NC}"
echo -e "  ${YELLOW}${REGISTRY}/base-tensorflow:latest${NC}"
echo -e "  ${YELLOW}${REGISTRY}/base-onnx:latest${NC}"
echo ""
echo -e "${GREEN}Tagged with today's date for versioning:${NC}"
echo -e "  ${YELLOW}$(date +%Y%m%d)${NC}"
echo ""
echo -e "${GREEN}Total images: 5${NC}"
echo ""

# Show image sizes
echo -e "${GREEN}Image Sizes:${NC}"
docker images | grep "${REGISTRY}" | grep "latest" | awk '{print "  " $1":"$2 " - " $7$8}'

echo -e "\n${GREEN}Done! Base images are ready for deployments.${NC}"
