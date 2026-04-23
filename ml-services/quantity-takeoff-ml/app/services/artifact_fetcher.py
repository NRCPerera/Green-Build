from __future__ import annotations

import logging
import os
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

from google.cloud import storage

logger = logging.getLogger(__name__)

MIN_MODEL_SIZE_BYTES = 1_000_000


class ModelDownloadError(RuntimeError):
    """Raised when a required model artifact cannot be prepared."""


def _is_valid_model_file(path: Path) -> bool:
    return path.exists() and path.stat().st_size >= MIN_MODEL_SIZE_BYTES


def _peek_file_prefix(path: Path, size: int = 200) -> bytes:
    with path.open("rb") as file_obj:
        return file_obj.read(size)


def _looks_like_text_error(prefix: bytes) -> bool:
    normalized = prefix.lstrip().lower()
    return (
        normalized.startswith(b"<")
        or normalized.startswith(b"<!doctype")
        or normalized.startswith(b"<?xml")
        or b"<html" in normalized[:100]
        or b"<error" in normalized[:100]
    )


def _download_via_http(download_url: str, path: Path) -> None:
    logger.info("Downloading model artifact %s from %s", path.name, download_url)

    with urlopen(download_url) as response, path.open("wb") as output_file:
        content_type = response.headers.get("Content-Type", "")
        logger.info("Download response for %s returned Content-Type=%s", path.name, content_type)
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output_file.write(chunk)


def _parse_gcs_uri(gcs_uri: str) -> tuple[str, str]:
    parsed = urlparse(gcs_uri)
    if parsed.scheme != "gs" or not parsed.netloc or not parsed.path.lstrip("/"):
        raise ModelDownloadError(
            f"Invalid GCS URI for model artifact: {gcs_uri}. Expected format gs://bucket/path/to/file"
        )
    return parsed.netloc, parsed.path.lstrip("/")


def _download_via_gcs(gcs_uri: str, path: Path) -> None:
    bucket_name, blob_name = _parse_gcs_uri(gcs_uri)
    logger.info("Downloading model artifact %s from private GCS object %s", path.name, gcs_uri)
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    if not blob.exists():
        raise ModelDownloadError(f"GCS object does not exist: {gcs_uri}")
    blob.download_to_filename(str(path))


def ensure_model_file(path: Path, env_var_name: str) -> None:
    if _is_valid_model_file(path):
        prefix = _peek_file_prefix(path)
        if _looks_like_text_error(prefix):
            snippet = prefix.decode("utf-8", errors="replace")
            raise ModelDownloadError(
                f"Existing file {path.name} is not a model checkpoint. "
                f"It looks like an HTML/XML error response: {snippet[:160]}"
            )
        logger.info("Model artifact already present: %s", path)
        return

    download_url = os.getenv(env_var_name)
    if not download_url:
        raise ModelDownloadError(
            f"Model file {path.name} is missing or invalid and {env_var_name} is not set."
        )

    path.parent.mkdir(parents=True, exist_ok=True)
    if download_url.startswith("gs://"):
        _download_via_gcs(download_url, path)
    else:
        _download_via_http(download_url, path)

    if not _is_valid_model_file(path):
        raise ModelDownloadError(
            f"Downloaded file for {path.name} is too small; expected real model weights."
        )

    prefix = _peek_file_prefix(path)
    if _looks_like_text_error(prefix):
        snippet = prefix.decode("utf-8", errors="replace")
        raise ModelDownloadError(
            f"Downloaded file for {path.name} is not a model checkpoint. "
            f"The URL likely returned an HTML/XML error page instead: {snippet[:160]}"
        )

    logger.info("Model artifact ready: %s (%.1f MB)", path, path.stat().st_size / (1024 * 1024))
