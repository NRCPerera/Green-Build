"""Data preprocessing service"""

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class Preprocessor:
    """Handles data preprocessing for model inference"""
    
    def __init__(
        self,
        categorical_mappings=None,
        numeric_medians=None,
        categorical_modes=None,
        feature_names=None,
        feature_scaler=None
    ):
        self.categorical_mappings = categorical_mappings or {}
        self.numeric_medians = numeric_medians or {}
        self.categorical_modes = categorical_modes or {}
        self.feature_names = feature_names or []
        self.feature_scaler = feature_scaler
    
    def preprocess(self, data: dict) -> np.ndarray:
        """
        Preprocess input data for model prediction
        
        Args:
            data: Dictionary of input features
            
        Returns:
            Preprocessed numpy array ready for model input
        """
        try:
            # Convert to DataFrame for easier processing
            df = pd.DataFrame([data])
            
            # Handle missing values
            df = self._handle_missing_values(df)
            
            # Encode categorical variables
            df = self._encode_categorical(df)
            
            # Ensure correct feature order
            if self.feature_names:
                # Add missing columns with default values
                for col in self.feature_names:
                    if col not in df.columns:
                        df[col] = 0
                
                # Reorder columns to match training
                df = df[self.feature_names]
            
            # Scale features
            if self.feature_scaler:
                scaled_data = self.feature_scaler.transform(df)
            else:
                scaled_data = df.values
            
            return scaled_data
            
        except Exception as e:
            logger.error(f"Preprocessing error: {str(e)}", exc_info=True)
            raise
    
    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values using medians for numeric and modes for categorical"""
        
        # Fill numeric columns with medians
        for col, median in self.numeric_medians.items():
            if col in df.columns:
                df[col].fillna(median, inplace=True)
        
        # Fill categorical columns with modes
        for col, mode in self.categorical_modes.items():
            if col in df.columns:
                df[col].fillna(mode, inplace=True)
        
        return df
    
    def _encode_categorical(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode categorical variables using mappings"""
        
        for col, mapping in self.categorical_mappings.items():
            if col in df.columns:
                # Map categorical values to numeric codes
                df[col] = df[col].map(mapping)
                # If mapping fails, use default value (0)
                df[col].fillna(0, inplace=True)
        
        return df