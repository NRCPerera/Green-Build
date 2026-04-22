from __future__ import annotations

from pathlib import Path
from typing import Any

from tensorflow import keras
from tensorflow.keras.layers import Dense, Dropout, InputLayer


def _patch_from_config(layer_cls: type) -> None:
    original = layer_cls.from_config

    def patched(cls, config: dict[str, Any]) -> Any:
        sanitized = dict(config)
        sanitized.pop("quantization_config", None)
        return original.__func__(cls, sanitized)

    layer_cls.from_config = classmethod(patched)


def enable_keras_deserialization_compat() -> None:
    for layer_cls in (Dense, Dropout, InputLayer):
        _patch_from_config(layer_cls)


def load_keras_model_compat(model_path: Path | str) -> Any:
    enable_keras_deserialization_compat()
    return keras.models.load_model(model_path, compile=False, safe_mode=False)
