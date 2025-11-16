#!/bin/bash

# Local testing script for AIForge Model API

set -e

API_URL=${API_URL:-http://localhost:8080}
API_KEY=${API_KEY:-dev-test-key-12345}

echo "Testing AIForge Model API at: ${API_URL}"
echo ""

# Test 1: Health Check
echo "1. Testing health endpoint..."
curl -s ${API_URL}/health | jq .
echo ""

# Test 2: Prediction
echo "2. Testing prediction endpoint..."
curl -s -X POST ${API_URL}/predict \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "input": [[5.1, 3.5, 1.4, 0.2]],
    "parameters": {}
  }' | jq .
echo ""

# Test 3: Model Info
echo "3. Testing model info endpoint..."
curl -s ${API_URL}/info \
  -H "X-API-Key: ${API_KEY}" | jq .
echo ""

# Test 4: Invalid API Key
echo "4. Testing invalid API key..."
curl -s -X POST ${API_URL}/predict \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key" \
  -d '{
    "input": [[1, 2, 3, 4]]
  }'
echo ""

echo "All tests completed!"
