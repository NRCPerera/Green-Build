FROM python:3.11-slim

WORKDIR /app

# Required for ML/Computer Vision libraries like OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY models/ ./models/

ENV DEV_MODE=false

# Use the shell form to allow $PORT expansion
# This will use the port Google gives you, or default to 8002 locally
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1