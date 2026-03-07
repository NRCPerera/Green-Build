from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import shap
from tensorflow.keras.models import load_model

from app.config import AppConfig

# Monkey-patch Dense to accept (and ignore) the ``quantization_config``
# keyword that Keras >=3.12 writes into saved model configs but whose
# ``__init__`` does not yet handle on this installed version.
_original_dense_init = _OriginalDense.__init__


def _patched_dense_init(self, *args, **kwargs):
    kwargs.pop("quantization_config", None)
    _original_dense_init(self, *args, **kwargs)


_OriginalDense.__init__ = _patched_dense_init


def _load_model(path: Path):
    return keras.saving.load_model(path)

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
class ModelRegistry:
    pre_project: PreProjectArtifacts


def _ensure_exists(path: Path) -> None:
    if not path.exists():
        raise ArtifactLoadError(f"Missing required artifact: {path}")


def _validate_feature_cols(feature_names: list[str], scope_name: str) -> None:
    if not isinstance(feature_names, (list, tuple)) or not feature_names:
        raise ArtifactLoadError(
            f"Invalid model_feature_names for {scope_name}: expected non-empty list"
        )


def load_pre_project_artifacts(config: AppConfig) -> PreProjectArtifacts:
    required_paths = [
        config.pre_project_regressor_model,
        config.pre_project_classifier_model,
        config.pre_project_feature_names,
    ]
    for path in required_paths:
        _ensure_exists(path)

    logger.info("Loading pre-project artifacts from %s", config.pre_project_dir)
    
    regressor_model = joblib.load(config.pre_project_regressor_model)
    classifier_model = joblib.load(config.pre_project_classifier_model)
    feature_names = joblib.load(config.pre_project_feature_names)
    
    if not isinstance(feature_names, list):
        feature_names = list(feature_names)
    
    _validate_feature_cols(feature_names, "pre_project")

    # Create SHAP explainer for the classifier
    logger.info("Creating SHAP TreeExplainer for classifier model")
    shap_explainer = shap.TreeExplainer(classifier_model)

    return PreProjectArtifacts(
        regressor_model=regressor_model,
        classifier_model=classifier_model,
        feature_names=feature_names,
        shap_explainer=shap_explainer,
    )


def load_model_registry(config: AppConfig) -> ModelRegistry:
    try:
        pre_project = load_pre_project_artifacts(config)
    except ArtifactLoadError:
        raise
    except Exception as exc:
        raise ArtifactLoadError(f"Failed to load pre_project artifacts: {exc}") from exc

    logger.info("Model registry initialized successfully")
    return ModelRegistry(pre_project=pre_project)
