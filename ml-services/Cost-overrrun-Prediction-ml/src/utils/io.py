from __future__ import annotations

from typing import Any

import pandas as pd


def find_missing_fields(payload: dict[str, Any], expected_fields: list[str]) -> list[str]:
    return [field for field in expected_fields if field not in payload]


def build_single_row_dataframe(payload: dict[str, Any], ordered_fields: list[str]) -> pd.DataFrame:
    row_data = {field: payload[field] for field in ordered_fields}
    return pd.DataFrame([row_data], columns=ordered_fields)
