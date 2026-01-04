"""Data preprocessing utilities"""

import logging
from typing import Dict, Any, List

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class Preprocessor:
    """Handles data preprocessing for model inference"""
    
    def __init__(
        self,
        categorical_mappings: Dict[str, List[str]],
        numeric_medians: Dict[str, float],
        categorical_modes: Dict[str, str],
        feature_names: List[str],
        feature_scaler: Any
    ):
        self.categorical_mappings = categorical_mappings
        self.numeric_medians = numeric_medians
        self.categorical_modes = categorical_modes
        self.feature_names = feature_names
        self.feature_scaler = feature_scaler
        
        # Determine numeric and categorical columns
        self.categorical_columns = list(categorical_mappings.keys())
        self.numeric_columns = list(numeric_medians.keys())
        
        logger.info(f"Preprocessor initialized with {len(self.numeric_columns)} numeric and {len(self.categorical_columns)} categorical features")
    
    def validate_categorical_values(self, data: Dict[str, Any]) -> None:
        """Validate categorical inputs against allowed values"""
        
        for col in self.categorical_columns:
            if col in data:
                value = data[col]
                if value is not None:
                    allowed_values = self.categorical_mappings[col]
                    if value not in allowed_values:
                        raise ValueError(
                            f"Invalid value '{value}' for categorical feature '{col}'. "
                            f"Allowed values: {allowed_values}"
                        )
    
    def impute_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Impute missing values using medians and modes"""
        
        df = df.copy()
        
        # Impute numeric features with medians
        for col in self.numeric_columns:
            if col in df.columns:
                if df[col].isnull().any():
                    median_value = self.numeric_medians[col]
                    df[col].fillna(median_value, inplace=True)
                    logger.debug(f"Imputed {col} with median: {median_value}")
        
        # Impute categorical features with modes
        for col in self.categorical_columns:
            if col in df.columns:
                if df[col].isnull().any():
                    mode_value = self.categorical_modes[col]
                    df[col].fillna(mode_value, inplace=True)
                    logger.debug(f"Imputed {col} with mode: {mode_value}")
        
        return df
    
    def encode_categorical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply one-hot encoding using pandas get_dummies with drop_first=True"""
        
        df = df.copy()
        
        # Separate numeric and categorical columns
        numeric_df = df[self.numeric_columns].copy()
        categorical_df = df[self.categorical_columns].copy()
        
        # Apply get_dummies with drop_first=True
        if not categorical_df.empty:
            encoded_df = pd.get_dummies(categorical_df, drop_first=True, dtype=float)
            logger.debug(f"Encoded categorical features into {len(encoded_df.columns)} dummy columns")
        else:
            encoded_df = pd.DataFrame()
        
        # Combine numeric and encoded categorical features
        result_df = pd.concat([numeric_df, encoded_df], axis=1)
        
        return result_df
    
    def align_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Align features to match training feature names"""
        
        df = df.copy()
        
        # Add missing columns with zeros
        for col in self.feature_names:
            if col not in df.columns:
                df[col] = 0
                logger.debug(f"Added missing feature '{col}' with value 0")
        
        # Select and reorder columns to match training
        df = df[self.feature_names]
        
        logger.debug(f"Aligned features to {len(self.feature_names)} columns")
        
        return df
    
    def scale_features(self, df: pd.DataFrame) -> np.ndarray:
        """Scale features using the loaded scaler"""
        
        scaled_array = self.feature_scaler.transform(df)
        logger.debug(f"Scaled features with shape {scaled_array.shape}")
        
        return scaled_array
    
    def preprocess(self, data: Dict[str, Any]) -> np.ndarray:
        """Complete preprocessing pipeline"""
        
        # Validate categorical values
        self.validate_categorical_values(data)
        
        # Convert to DataFrame
        df = pd.DataFrame([data])
        
        # Impute missing values
        df = self.impute_missing_values(df)
        
        # Encode categorical features
        df = self.encode_categorical_features(df)
        
        # Align features
        df = self.align_features(df)
        
        # Scale features
        scaled_data = self.scale_features(df)
        
        logger.info(f"Preprocessing complete. Final shape: {scaled_data.shape}")
        
        return scaled_data
