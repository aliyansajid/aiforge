#!/bin/bash

# Upload model files to Google Cloud Storage
# Usage: ./scripts/upload-model.sh <model_file> <user_id> <model_id>

set -e

if [ "$#" -ne 3 ]; then
    echo "Error: Missing arguments"
    echo "Usage: ./scripts/upload-model.sh <model_file> <user_id> <model_id>"
    echo "Example: ./scripts/upload-model.sh model.pt user123 my-model-v1"
    exit 1
fi

MODEL_FILE=$1
USER_ID=$2
MODEL_ID=$3
BUCKET_NAME=${BUCKET_NAME:-aiforge-models}
PROJECT_ID=${PROJECT_ID:-aiforge-2026}

echo "Uploading model to GCS..."
echo "Project: ${PROJECT_ID}"
echo "Bucket: ${BUCKET_NAME}"
echo "Path: ${USER_ID}/${MODEL_ID}/"

# Set project
gcloud config set project ${PROJECT_ID}

# Upload model file
gsutil cp ${MODEL_FILE} gs://${BUCKET_NAME}/${USER_ID}/${MODEL_ID}/

# Upload metadata if exists
if [ -f "metadata.json" ]; then
    gsutil cp metadata.json gs://${BUCKET_NAME}/${USER_ID}/${MODEL_ID}/
fi

# Upload requirements if exists
if [ -f "requirements.txt" ]; then
    gsutil cp requirements.txt gs://${BUCKET_NAME}/${USER_ID}/${MODEL_ID}/
fi

echo "Upload complete!"
echo "Model path: gs://${BUCKET_NAME}/${USER_ID}/${MODEL_ID}/"
