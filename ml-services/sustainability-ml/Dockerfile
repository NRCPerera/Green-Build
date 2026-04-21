FROM python:3.11-slim

WORKDIR /app

# Essential system dependencies for OpenCV/ML (common in floor plan projects)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY models/ ./models/

# Use shell form to expand the $PORT variable provided by Google
# This uses the port Google gives it, or defaults to 8003 for your local testing
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8003} --workers 1