from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
from tensorflow.keras.models import load_model

from app.config import AppConfig

logger = logging.getLogger(__name__)


class ArtifactLoadError(RuntimeError):
    """Raised when model artifacts are missing or invalid."""


@dataclass(frozen=True)
class PreProjectArtifacts:
    ann_reg_model: Any
    ann_clf_model: Any
    preprocess: Any
    scaler: Any
    metadata: dict[str, Any]


@dataclass(frozen=True)
class InProgressArtifacts:
    ann_reg_model: Any
    preprocess: Any
    scaler: Any
    metadata: dict[str, Any]


@dataclass(frozen=True)
class ModelRegistry:
    pre_project: PreProjectArtifacts
    in_progress: InProgressArtifacts


def _ensure_exists(path: Path) -> None:
    if not path.exists():
        raise ArtifactLoadError(f"Missing required artifact: {path}")


def _validate_feature_cols(metadata: dict[str, Any], scope_name: str) -> None:
    feature_cols = metadata.get("feature_cols")
    if not isinstance(feature_cols, (list, tuple)) or not feature_cols:
        raise ArtifactLoadError(
            f"Invalid metadata for {scope_name}: expected non-empty 'feature_cols' list"
        )


def load_pre_project_artifacts(config: AppConfig) -> PreProjectArtifacts:
    required_paths = [
        config.pre_project_ann_reg_model,
        config.pre_project_ann_clf_model,
        config.pre_project_preprocess,
        config.pre_project_scaler,
        config.pre_project_metadata,
    ]
    for path in required_paths:
        _ensure_exists(path)

    logger.info("Loading pre-project artifacts from %s", config.pre_project_dir)
    metadata = joblib.load(config.pre_project_metadata)
    _validate_feature_cols(metadata, "pre_project")

    return PreProjectArtifacts(
        ann_reg_model=load_model(config.pre_project_ann_reg_model),
        ann_clf_model=load_model(config.pre_project_ann_clf_model),
        preprocess=joblib.load(config.pre_project_preprocess),
        scaler=joblib.load(config.pre_project_scaler),
        metadata=metadata,
    )


def load_in_progress_artifacts(config: AppConfig) -> InProgressArtifacts:
    required_paths = [
        config.in_progress_ann_reg_model,
        config.in_progress_preprocess,
        config.in_progress_scaler,
        config.in_progress_metadata,
    ]
    for path in required_paths:
        _ensure_exists(path)

    logger.info("Loading in-progress artifacts from %s", config.in_progress_dir)
    metadata = joblib.load(config.in_progress_metadata)
    _validate_feature_cols(metadata, "in_progress")

    return InProgressArtifacts(
        ann_reg_model=load_model(config.in_progress_ann_reg_model),
        preprocess=joblib.load(config.in_progress_preprocess),
        scaler=joblib.load(config.in_progress_scaler),
        metadata=metadata,
    )


def load_model_registry(config: AppConfig) -> ModelRegistry:
    try:
        pre_project = load_pre_project_artifacts(config)
        in_progress = load_in_progress_artifacts(config)
    except ArtifactLoadError:
        raise
    except Exception as exc:
        raise ArtifactLoadError(f"Failed to load model artifacts: {exc}") from exc

    logger.info("All model artifacts loaded successfully")
    return ModelRegistry(pre_project=pre_project, in_progress=in_progress)
