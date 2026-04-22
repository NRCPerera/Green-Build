FROM python:3.11-slim

WORKDIR /app

# System dependencies for OpenCV and Git LFS (to fetch real model weights)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# --- Fetch real model weights from Git LFS ---
# Cloud Build does NOT pull LFS files, so the models/ dir contains tiny pointer files.
# We clone only the models directory from the repo using Git LFS.
ARG GIT_REPO_URL=https://github.com/NRCPerera/Green-Build.git
ARG GIT_BRANCH=main

RUN git lfs install && \
    git clone --no-checkout --filter=blob:none --sparse ${GIT_REPO_URL} /tmp/repo && \
    cd /tmp/repo && \
    git sparse-checkout set ml-services/quantity-takeoff-ml/models && \
    git checkout ${GIT_BRANCH} && \
    git lfs pull --include="ml-services/quantity-takeoff-ml/models/*.pth" && \
    mv ml-services/quantity-takeoff-ml/models /app/models && \
    rm -rf /tmp/repo

# Verify model files are real weights (not LFS pointers)
RUN echo "=== Model file sizes ===" && \
    ls -lh /app/models/ && \
    for f in /app/models/*.pth; do \
        size=$(stat -c%s "$f"); \
        if [ "$size" -lt 1000000 ]; then \
            echo "ERROR: $f is only $size bytes — Git LFS pull failed!" && exit 1; \
        fi; \
    done && \
    echo "=== All model files verified ==="

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1