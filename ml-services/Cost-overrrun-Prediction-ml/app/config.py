from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    base_dir: Path
    models_dir: Path

    # Pre-project paths
    pre_project_dir: Path
    pre_project_ann_reg_model: Path
    pre_project_ann_clf_model: Path
    pre_project_preprocess: Path
    pre_project_scaler: Path
    pre_project_metadata: Path

    # In-progress paths
    in_progress_dir: Path
    in_progress_ann_reg_model: Path
    in_progress_preprocess: Path
    in_progress_scaler: Path
    in_progress_metadata: Path


def get_config() -> AppConfig:
    base_dir = Path(__file__).resolve().parent.parent
    models_dir = base_dir / "models"

    pre_project_dir = models_dir / "pre_project"
    in_progress_dir = models_dir / "in_progress"

    return AppConfig(
        base_dir=base_dir,
        models_dir=models_dir,
        # Pre-project artifacts
        pre_project_dir=pre_project_dir,
        pre_project_ann_reg_model=pre_project_dir / "best_cost_overrun_regressor1.joblib",
        pre_project_ann_clf_model=pre_project_dir / "best_cost_overrun_classifier1.joblib",
        pre_project_preprocess=pre_project_dir / "model_feature_names1.joblib",
        pre_project_scaler=pre_project_dir / "model_feature_names1.joblib",
        pre_project_metadata=pre_project_dir / "model_feature_names1.joblib",
        # In-progress artifacts
        in_progress_dir=in_progress_dir,
        in_progress_ann_reg_model=in_progress_dir / "in_progress_ann_reg_model.keras",
        in_progress_preprocess=in_progress_dir / "in_progress_preprocess.joblib",
        in_progress_scaler=in_progress_dir / "in_progress_scaler.joblib",
        in_progress_metadata=in_progress_dir / "in_progress_metadata.joblib",
    )
