from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    base_dir: Path
    models_dir: Path

    pre_project_dir: Path
    pre_project_regressor_model: Path
    pre_project_classifier_model: Path
    pre_project_feature_names: Path


def get_config() -> AppConfig:
    base_dir = Path(__file__).resolve().parent.parent
    models_dir = base_dir / "models"

    pre_project_dir = models_dir / "pre_project"

    return AppConfig(
        base_dir=base_dir,
        models_dir=models_dir,
        pre_project_dir=pre_project_dir,
        pre_project_regressor_model=pre_project_dir / "best_cost_overrun_regressor1.joblib",
        pre_project_classifier_model=pre_project_dir / "best_cost_overrun_classifier1.joblib",
        pre_project_feature_names=pre_project_dir / "model_feature_names1.joblib",
    )
