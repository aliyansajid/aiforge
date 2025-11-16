#!/bin/bash

# Install Python dependencies for local development

set -e

echo "Installing AIForge API dependencies..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 not found. Please install Python 3.9 or higher."
    exit 1
fi

echo "Python version:"
python3 --version
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo ""

# Activate venv
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip
echo ""

# Install dependencies
echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt
echo ""

# Install dev dependencies (optional)
read -p "Install development dependencies (pytest, etc.)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pip install pytest pytest-asyncio httpx black flake8
    echo "✓ Development dependencies installed"
fi
echo ""

echo "========================================="
echo "Installation complete!"
echo "========================================="
echo ""
echo "To activate the virtual environment:"
echo "  source venv/bin/activate"
echo ""
echo "To run the server:"
echo "  python -m app.main"
echo "  OR"
echo "  uvicorn app.main:app --reload"
echo ""
echo "To run tests:"
echo "  pytest tests/"
echo ""
