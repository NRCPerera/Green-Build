from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib

from app.config import AppConfig

logger = logging.getLogger(__name__)


class ArtifactLoadError(RuntimeError):
    """Raised when model artifacts are missing or invalid."""


@dataclass(frozen=True)
class PreProjectArtifacts:
    regressor_model: Any
    classifier_model: Any
    feature_names: list[str]
    shap_explainer: Any


@dataclass(frozen=True)
class InProgressArtifacts:
    ann_reg_model: Any
    preprocess: Any
    scaler: Any
    metadata: dict[str, Any]


@dataclass(frozen=True)
class ModelRegistry:
    pre_project: PreProjectArtifacts
    in_progress: InProgressArtifacts | None


def _ensure_exists(path: Path) -> None:
    if not path.exists():
        raise ArtifactLoadError(f"Missing required artifact: {path}")


def load_pre_project_artifacts(config: AppConfig) -> PreProjectArtifacts:
    """Load pre-project sklearn models (joblib format)."""
    required_paths = [
        config.pre_project_ann_reg_model,
        config.pre_project_ann_clf_model,
        config.pre_project_metadata,
    ]
    for path in required_paths:
        _ensure_exists(path)

    logger.info("Loading pre-project artifacts from %s", config.pre_project_dir)

    # Load feature names / metadata
    feature_names = joblib.load(config.pre_project_metadata)
    if isinstance(feature_names, dict):
        feature_names = feature_names.get("feature_cols", feature_names.get("feature_names", []))

    return PreProjectArtifacts(
        regressor_model=joblib.load(config.pre_project_ann_reg_model),
        classifier_model=joblib.load(config.pre_project_ann_clf_model),
        feature_names=feature_names,
        shap_explainer=None,  # Will be populated below if available
    )


def load_in_progress_artifacts(config: AppConfig) -> InProgressArtifacts | None:
    """Load in-progress Keras model and preprocessing artifacts."""
    required_paths = [
        config.in_progress_ann_reg_model,
        config.in_progress_preprocess,
        config.in_progress_scaler,
        config.in_progress_metadata,
    ]
    for path in required_paths:
        if not path.exists():
            logger.warning("In-progress artifact missing: %s — skipping in-progress model", path)
            return None

    logger.info("Loading in-progress artifacts from %s", config.in_progress_dir)

    try:
        import keras
        ann_reg_model = keras.saving.load_model(config.in_progress_ann_reg_model)
    except Exception as e:
        logger.warning("Failed to load in-progress keras model: %s", e)
        return None

    metadata = joblib.load(config.in_progress_metadata)

    return InProgressArtifacts(
        ann_reg_model=ann_reg_model,
        preprocess=joblib.load(config.in_progress_preprocess),
        scaler=joblib.load(config.in_progress_scaler),
        metadata=metadata,
    )


def load_model_registry(config: AppConfig) -> ModelRegistry:
    try:
        pre_project = load_pre_project_artifacts(config)
    except ArtifactLoadError:
        raise
    except Exception as exc:
        raise ArtifactLoadError(f"Failed to load pre-project artifacts: {exc}") from exc

    try:
        in_progress = load_in_progress_artifacts(config)
    except Exception as exc:
        logger.warning("In-progress artifacts failed to load (non-fatal): %s", exc)
        in_progress = None

    logger.info("All model artifacts loaded successfully")
    return ModelRegistry(pre_project=pre_project, in_progress=in_progress)
