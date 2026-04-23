from __future__ import annotations

import logging
import os
from pathlib import Path
from urllib.request import urlopen

logger = logging.getLogger(__name__)

MIN_MODEL_SIZE_BYTES = 1_000_000


class ModelDownloadError(RuntimeError):
    """Raised when a required model artifact cannot be prepared."""


def _is_valid_model_file(path: Path) -> bool:
    return path.exists() and path.stat().st_size >= MIN_MODEL_SIZE_BYTES


def ensure_model_file(path: Path, env_var_name: str) -> None:
    if _is_valid_model_file(path):
        logger.info("Model artifact already present: %s", path)
        return

    download_url = os.getenv(env_var_name)
    if not download_url:
        raise ModelDownloadError(
            f"Model file {path.name} is missing or invalid and {env_var_name} is not set."
        )

    path.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading model artifact %s", path.name)

    with urlopen(download_url) as response, path.open("wb") as output_file:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output_file.write(chunk)

    if not _is_valid_model_file(path):
        raise ModelDownloadError(
            f"Downloaded file for {path.name} is too small; expected real model weights."
        )

    logger.info("Model artifact ready: %s (%.1f MB)", path, path.stat().st_size / (1024 * 1024))
