FROM python:3.11-slim

WORKDIR /app

# System dependencies for OpenCV (Required for floor plan/ML processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY models/ ./models/

# Use the shell form to expand the $PORT variable provided by Google
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1