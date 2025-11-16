#!/bin/bash

# Verify Google Cloud Platform setup for AIForge
# This script checks if all required GCP resources are configured correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="aiforge-2026"
REGION="asia-south1"
BUCKET_MODELS="aiforge-models"
BUCKET_BUILD="aiforge-build-sources"
ARTIFACT_REPO="aiforge-models-repo"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AIForge GCP Setup Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if gcloud is installed
echo -e "${YELLOW}1. Checking gcloud CLI...${NC}"
if command -v gcloud &> /dev/null; then
    echo -e "${GREEN}✓ gcloud CLI installed${NC}"
    gcloud version | head -n 1
else
    echo -e "${RED}✗ gcloud CLI not found${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo ""

# Check if authenticated
echo -e "${YELLOW}2. Checking authentication...${NC}"
if gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
    echo -e "${GREEN}✓ Authenticated as: ${ACCOUNT}${NC}"
else
    echo -e "${RED}✗ Not authenticated${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi
echo ""

# Check project
echo -e "${YELLOW}3. Checking project: ${PROJECT_ID}...${NC}"
if gcloud projects describe ${PROJECT_ID} &> /dev/null; then
    echo -e "${GREEN}✓ Project exists${NC}"
else
    echo -e "${RED}✗ Project not found${NC}"
    exit 1
fi
echo ""

# Check APIs
echo -e "${YELLOW}4. Checking required APIs...${NC}"
REQUIRED_APIS=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "storage.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if gcloud services list --enabled --project=${PROJECT_ID} | grep -q ${api}; then
        echo -e "${GREEN}✓ ${api} enabled${NC}"
    else
        echo -e "${RED}✗ ${api} not enabled${NC}"
        echo "  Run: gcloud services enable ${api}"
    fi
done
echo ""

# Check GCS buckets
echo -e "${YELLOW}5. Checking GCS buckets...${NC}"
if gsutil ls -p ${PROJECT_ID} gs://${BUCKET_MODELS} &> /dev/null; then
    echo -e "${GREEN}✓ Bucket ${BUCKET_MODELS} exists${NC}"
else
    echo -e "${RED}✗ Bucket ${BUCKET_MODELS} not found${NC}"
    echo "  Run: gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${BUCKET_MODELS}"
fi

if gsutil ls -p ${PROJECT_ID} gs://${BUCKET_BUILD} &> /dev/null; then
    echo -e "${GREEN}✓ Bucket ${BUCKET_BUILD} exists${NC}"
else
    echo -e "${RED}✗ Bucket ${BUCKET_BUILD} not found${NC}"
    echo "  Run: gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${BUCKET_BUILD}"
fi
echo ""

# Check Artifact Registry
echo -e "${YELLOW}6. Checking Artifact Registry...${NC}"
if gcloud artifacts repositories describe ${ARTIFACT_REPO} \
    --location=${REGION} \
    --project=${PROJECT_ID} &> /dev/null; then
    echo -e "${GREEN}✓ Repository ${ARTIFACT_REPO} exists${NC}"
else
    echo -e "${RED}✗ Repository ${ARTIFACT_REPO} not found${NC}"
    echo "  Run: gcloud artifacts repositories create ${ARTIFACT_REPO} \\"
    echo "         --repository-format=docker \\"
    echo "         --location=${REGION} \\"
    echo "         --project=${PROJECT_ID}"
fi
echo ""

# Check Docker authentication
echo -e "${YELLOW}7. Checking Docker authentication...${NC}"
if docker info &> /dev/null; then
    echo -e "${GREEN}✓ Docker is running${NC}"

    # Check if authenticated to Artifact Registry
    if grep -q "asia-south1-docker.pkg.dev" ~/.docker/config.json 2>/dev/null; then
        echo -e "${GREEN}✓ Docker authenticated to Artifact Registry${NC}"
    else
        echo -e "${YELLOW}⚠ Docker not authenticated to Artifact Registry${NC}"
        echo "  Run: gcloud auth configure-docker asia-south1-docker.pkg.dev"
    fi
else
    echo -e "${RED}✗ Docker not running${NC}"
    echo "  Start Docker Desktop or Docker daemon"
fi
echo ""

# Check service account file
echo -e "${YELLOW}8. Checking service account...${NC}"
if [ -f "../service-account.json" ]; then
    echo -e "${GREEN}✓ Service account key found${NC}"

    # Extract service account email
    SA_EMAIL=$(grep -o '"client_email": "[^"]*' ../service-account.json | cut -d'"' -f4)
    echo -e "  Email: ${SA_EMAIL}"

    # Check if service account has required roles
    echo -e "\n  Checking permissions..."
    REQUIRED_ROLES=(
        "roles/storage.admin"
        "roles/run.admin"
        "roles/artifactregistry.writer"
    )

    for role in "${REQUIRED_ROLES[@]}"; do
        if gcloud projects get-iam-policy ${PROJECT_ID} \
            --flatten="bindings[].members" \
            --filter="bindings.members:serviceAccount:${SA_EMAIL} AND bindings.role:${role}" \
            --format="value(bindings.role)" | grep -q ${role}; then
            echo -e "${GREEN}  ✓ ${role}${NC}"
        else
            echo -e "${YELLOW}  ⚠ ${role} not granted${NC}"
            echo "    Run: gcloud projects add-iam-policy-binding ${PROJECT_ID} \\"
            echo "           --member=\"serviceAccount:${SA_EMAIL}\" \\"
            echo "           --role=\"${role}\""
        fi
    done
else
    echo -e "${RED}✗ Service account key not found${NC}"
    echo "  Expected location: apps/api/service-account.json"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "1. Fix any ${RED}✗ errors${NC} shown above"
echo -e "2. Test local deployment: ${GREEN}docker-compose up${NC}"
echo -e "3. Deploy to Cloud Run: ${GREEN}./scripts/deploy.sh iris-v1 test-user${NC}"
echo ""
