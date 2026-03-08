"""Construction delay prediction service using Stacking Ensemble models"""

import logging
from pathlib import Path
from typing import Dict, Any

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class DelayPredictor:
    """
    Handles construction delay predictions using trained Stacking Ensemble models.
    
    Models are trained with XGBoost + RandomForest + LightGBM base estimators
    and a meta-learner (RidgeCV for regression, LogisticRegression for classification).
    
    Supports:
    - Regression: Predicts total delay days with P10/P90 quantile uncertainty
    - Classification: Predicts delay category (No Delay, Minor, Major, Critical)
    - SHAP explainability for individual predictions
    """
    
    def __init__(self, models_dir: Path):
        """
        Initialize the predictor by loading all required models and artifacts.
        
        Args:
            models_dir: Path to the directory containing model files
        """
        self.models_dir = models_dir
        
        logger.info("Initializing DelayPredictor...")
        
        # Load all artifacts
        self._load_artifacts()
        
        logger.info("DelayPredictor initialized successfully")
    
    def _load_artifacts(self):
        """
        Load all ML model bundles and explainers.
        
        Supports TWO bundle formats:
        
        NEW FORMAT (Stacking Ensemble training scripts):
            Regression:     main_pipeline, p10_pipeline, p90_pipeline, preprocessor, feature_names
            Classification: main_pipeline, preprocessor, label_encoder, feature_names
        
        LEGACY FORMAT (old XGBoost-only training):
            Both bundles:   preprocess (ColumnTransformer), model (XGBRegressor/Classifier)
        
        The format is auto-detected based on the keys present in the bundle.
        """
        
        try:
            # ==========================================
            # Load Regression Model Bundle
            # ==========================================
            regression_bundle_path = self.models_dir / "delay_regression_bundle.joblib"
            regression_bundle = joblib.load(regression_bundle_path)
            reg_keys = list(regression_bundle.keys())
            
            logger.info(f"Loaded regression bundle (keys: {reg_keys})")
            
            if "main_pipeline" in regression_bundle:
                # ---- NEW FORMAT: Full sklearn Pipeline ----
                self._legacy_regression = False
                self.regression_pipeline = regression_bundle["main_pipeline"]
                self.regression_preprocess = regression_bundle["preprocessor"]
                self.p10_pipeline = regression_bundle.get("p10_pipeline", None)
                self.p90_pipeline = regression_bundle.get("p90_pipeline", None)
                self.regression_feature_names = regression_bundle.get("feature_names", None)
                logger.info("Regression: Using NEW ensemble pipeline format")
            else:
                # ---- LEGACY FORMAT: preprocess + model ----
                self._legacy_regression = True
                self.regression_preprocess = regression_bundle["preprocess"]
                self.regression_model = regression_bundle["model"]
                self.p10_pipeline = None
                self.p90_pipeline = None
                self.regression_pipeline = None
                self.regression_feature_names = None
                logger.info("Regression: Using LEGACY preprocess+model format")
            
            # Load Regression Explainer (optional)
            try:
                reg_explainer_path = self.models_dir / "regression_explainer.joblib"
                self.regression_explainer = joblib.load(reg_explainer_path)
                logger.info(f"Loaded regression explainer from {reg_explainer_path}")
            except FileNotFoundError:
                self.regression_explainer = None
                logger.info("No regression explainer found (optional)")
            
            # ==========================================
            # Load Classification Model Bundle
            # ==========================================
            classification_bundle_path = self.models_dir / "delay_classification_bundle.joblib"
            classification_bundle = joblib.load(classification_bundle_path)
            clf_keys = list(classification_bundle.keys())
            
            logger.info(f"Loaded classification bundle (keys: {clf_keys})")
            
            if "main_pipeline" in classification_bundle:
                # ---- NEW FORMAT: Full sklearn Pipeline ----
                self._legacy_classification = False
                self.classification_pipeline = classification_bundle["main_pipeline"]
                self.classification_preprocess = classification_bundle["preprocessor"]
                self.label_encoder = classification_bundle["label_encoder"]
                self.classification_feature_names = classification_bundle.get("feature_names", None)
                logger.info(f"Classification: Using NEW ensemble pipeline format")
                logger.info(f"Classification classes: {list(self.label_encoder.classes_)}")
            else:
                # ---- LEGACY FORMAT: preprocess + model ----
                self._legacy_classification = True
                self.classification_preprocess = classification_bundle["preprocess"]
                self.classification_model = classification_bundle["model"]
                self.classification_pipeline = None
                self.label_encoder = classification_bundle.get("label_encoder", None)
                self.classification_feature_names = None
                logger.info("Classification: Using LEGACY preprocess+model format")
                if self.label_encoder:
                    logger.info(f"Classification classes: {list(self.label_encoder.classes_)}")
                else:
                    logger.info(f"No label_encoder, using model.classes_: {list(self.classification_model.classes_)}")
            
            # Load Classification Explainer (optional)
            try:
                clf_explainer_path = self.models_dir / "classification_explainer.joblib"
                self.classification_explainer = joblib.load(clf_explainer_path)
                logger.info(f"Loaded classification explainer from {clf_explainer_path}")
            except FileNotFoundError:
                self.classification_explainer = None
                logger.info("No classification explainer found (optional)")
                
        except Exception as e:
            logger.error(f"Failed to load artifacts: {str(e)}", exc_info=True)
            raise
    
    def _prepare_dataframe(self, payload: Dict[str, Any]) -> pd.DataFrame:
        """
        Convert API payload to DataFrame with features matching the loaded model.
        
        Handles TWO feature sets:
        
        NEW FORMAT (Stacking Ensemble training scripts):
            Numeric: Floors, Contractor_Experience_Years, Contractor_Previous_Projects,
                     Contractor_Past_Delay_Rate, Labour_Pool_Size, Labour_Assigned_To_Project,
                     Planned_Duration_Days, Weather_Impact_Days, Design_Change_Orders,
                     Material_Delivery_Delay_Days, Payment_Delay_Days
            Categorical: Project_Type, Province, District, Location,
                         Contractor_ICTAD_Grade, Start_Season, Payment_Delay_History
        
        LEGACY FORMAT (old XGBoost models):
            Numeric: Project_Area_SqM, Floors, Contractor_Experience_Years, etc.
            Categorical: District, Project_Type, Project_Started_date, Planned_End_Date,
                         Contractor_ICTAD_Grade
        """
        if self._legacy_regression:
            return self._prepare_legacy_dataframe(payload)
        else:
            return self._prepare_new_dataframe(payload)
    
    def _prepare_new_dataframe(self, payload: Dict[str, Any]) -> pd.DataFrame:
        """Prepare DataFrame for NEW ensemble models"""
        data = {
            # ---- Categorical Features ----
            "Project_Type": payload.get("Project_Type", "House"),
            "Province": payload.get("Province", "Western"),
            "District": payload.get("District", "Colombo"),
            "Location": payload.get("Location", "Colombo"),
            "Contractor_ICTAD_Grade": payload.get("Contractor_ICTAD_Grade", "M1"),
            "Start_Season": payload.get("Start_Season", "SW Monsoon"),
            "Payment_Delay_History": payload.get("Payment_Delay_History", "No"),
            
            # ---- Numeric Features ----
            "Floors": payload.get("Floors", 3),
            "Contractor_Experience_Years": payload.get("Contractor_Experience_Years", 10),
            "Contractor_Previous_Projects": payload.get("Contractor_Previous_Projects", 15),
            "Contractor_Past_Delay_Rate": payload.get("Contractor_Past_Delay_Rate", 0.15),
            "Labour_Pool_Size": payload.get("Labour_Pool_Size", 50),
            "Labour_Assigned_To_Project": payload.get("Labour_Assigned_To_Project", 25),
            "Planned_Duration_Days": payload.get("Planned_Duration_Days", 360),
            "Weather_Impact_Days": payload.get("Weather_Impact_Days", 25),
            "Design_Change_Orders": payload.get("Design_Change_Orders", 2),
            "Material_Delivery_Delay_Days": payload.get("Material_Delivery_Delay_Days", 5),
            "Payment_Delay_Days": payload.get("Payment_Delay_Days", 10),
        }
        return pd.DataFrame([data])
    
    def _prepare_legacy_dataframe(self, payload: Dict[str, Any]) -> pd.DataFrame:
        """
        Prepare DataFrame for LEGACY XGBoost-only models.
        
        Old models expect: Project_Area_SqM, Floors, Contractor_Experience_Years,
        Contractor_Past_Delay_Rate, Contractor_Previous_Projects, Labor_Availability,
        Material_Delivery_Delay_Days, Payment_Delay_History, Financial_Issues,
        Weather_Impact_Days, planned_duration_days, start_year, start_month,
        planned_end_year, planned_end_month, District, Project_Type,
        Project_Started_date, Planned_End_Date, Contractor_ICTAD_Grade
        """
        from datetime import datetime, timedelta
        
        planned_duration_days = payload.get("Planned_Duration_Days", 360)
        
        # Derive date features
        start_date_str = payload.get("Project_Started_date", None)
        if start_date_str:
            try:
                start_date = datetime.strptime(str(start_date_str), "%Y-%m-%d")
            except (ValueError, TypeError):
                start_date = datetime.now()
        else:
            start_date = datetime.now()
        
        end_date = start_date + timedelta(days=planned_duration_days)
        
        data = {
            # ---- Numeric Features ----
            "Project_Area_SqM": payload.get("Project_Area_SqM", 500),
            "Floors": payload.get("Floors", 3),
            "Contractor_Experience_Years": payload.get("Contractor_Experience_Years", 10),
            "Contractor_Past_Delay_Rate": payload.get("Contractor_Past_Delay_Rate", 0.15),
            "Contractor_Previous_Projects": payload.get("Contractor_Previous_Projects", 15),
            "Labor_Availability": payload.get("Labor_Availability", payload.get("Labour_Pool_Size", 3)),
            "Material_Delivery_Delay_Days": payload.get("Material_Delivery_Delay_Days", 5),
            "Payment_Delay_History": payload.get("Payment_Delay_Days", 10),
            "Financial_Issues": payload.get("Financial_Issues", 0),
            "Weather_Impact_Days": payload.get("Weather_Impact_Days", 25),
            "planned_duration_days": planned_duration_days,
            "start_year": start_date.year,
            "start_month": start_date.month,
            "planned_end_year": end_date.year,
            "planned_end_month": end_date.month,
            
            # ---- Categorical Features ----
            "District": payload.get("District", "Colombo"),
            "Project_Type": payload.get("Project_Type", "House"),
            "Project_Started_date": start_date.strftime("%Y-%m-%d"),
            "Planned_End_Date": end_date.strftime("%Y-%m-%d"),
            "Contractor_ICTAD_Grade": payload.get("Contractor_ICTAD_Grade", "M1"),
        }
        return pd.DataFrame([data])
    
    def _get_delay_severity(self, delay_days: float) -> str:
        """
        Convert delay days to severity label.
        
        Args:
            delay_days: Predicted delay days
            
        Returns:
            Human-readable severity label
        """
        if delay_days <= 0:
            return "No Delay"
        elif delay_days <= 30:
            return "Minor Delay (1-30 days)"
        elif delay_days <= 90:
            return "Major Delay (31-90 days)"
        else:
            return "Critical Delay (>90 days)"
    
    def predict_regression(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict total delay days using the Stacking Ensemble regression model,
        plus P10/P90 quantiles and SHAP explainability.
        
        The main_pipeline is a full sklearn Pipeline that handles preprocessing
        internally, so we pass the raw DataFrame directly for prediction.
        
        For SHAP, we use the standalone preprocessor to transform data,
        then pass to the TreeExplainer.
        
        Args:
            payload: Dictionary of input features
            
        Returns:
            Dictionary with predicted_delay_days, p10, p90, and shap_values
        """
        try:
            logger.info("Running regression prediction...")
            
            # Prepare DataFrame (raw features matching training columns)
            df = self._prepare_dataframe(payload)
            
            # 1. Main Prediction (Point Estimate)
            if self._legacy_regression:
                # LEGACY: manually preprocess then predict
                X_processed = self.regression_preprocess.transform(df)
                prediction = self.regression_model.predict(X_processed)
            else:
                # NEW: main_pipeline includes preprocessor
                prediction = self.regression_pipeline.predict(df)
            predicted_delay_days = max(0.0, float(prediction[0]))
            
            logger.info(f"Predicted delay days: {predicted_delay_days:.2f}")
            
            # 2. Uncertainty Intervals (P10 / P90)
            if not self._legacy_regression and self.p10_pipeline and self.p90_pipeline:
                try:
                    # NEW format: quantile pipelines include preprocessor
                    p10_pred = self.p10_pipeline.predict(df)
                    p90_pred = self.p90_pipeline.predict(df)
                    p10_delay_days = max(0.0, float(p10_pred[0]))
                    p90_delay_days = max(0.0, float(p90_pred[0]))
                    
                    # Sanity check constraints
                    if p10_delay_days > predicted_delay_days:
                        p10_delay_days = predicted_delay_days * 0.8
                    if p90_delay_days < predicted_delay_days:
                        p90_delay_days = predicted_delay_days * 1.2
                except Exception as e:
                    logger.warning(f"Failed to compute quantiles: {e}")
                    p10_delay_days = predicted_delay_days * 0.8
                    p90_delay_days = predicted_delay_days * 1.2
            else:
                # Fallback (legacy or no quantile pipelines): ±20%
                logger.info("No quantile pipelines available, using ±20% estimate")
                p10_delay_days = predicted_delay_days * 0.8
                p90_delay_days = predicted_delay_days * 1.2
                
            # 3. SHAP Feature Importances
            shap_dict = {}
            if self.regression_explainer and self.regression_feature_names:
                try:
                    # Use STANDALONE preprocessor for SHAP
                    X_transformed = self.regression_preprocess.transform(df)
                    shap_values = self.regression_explainer.shap_values(X_transformed)
                    
                    if isinstance(shap_values, list):
                        shap_vals_row = shap_values[0][0] 
                    else:
                        shap_vals_row = shap_values[0]
                        
                    for feature_name, val in zip(self.regression_feature_names, shap_vals_row):
                        if abs(val) > 0.05:
                            shap_dict[feature_name] = round(float(val), 3)
                except Exception as e:
                    logger.warning(f"Failed to compute SHAP values: {e}")
            
            return {
                "predicted_delay_days": round(predicted_delay_days, 2),
                "delay_severity": self._get_delay_severity(predicted_delay_days),
                "p10_delay_days": round(p10_delay_days, 2),
                "p90_delay_days": round(p90_delay_days, 2),
                "shap_values": shap_dict if shap_dict else None
            }
            
        except Exception as e:
            logger.error(f"Regression prediction failed: {str(e)}", exc_info=True)
            raise
    
    def predict_classification(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict delay category using the Stacking Ensemble classification model.
        
        The main_pipeline is a full sklearn Pipeline that handles preprocessing
        internally, so we pass the raw DataFrame directly.
        
        Categories (from LabelEncoder):
        - No Delay: 0 days
        - Minor Delay: 1-30 days
        - Major Delay: 31-90 days
        - Critical Delay: >90 days
        
        Args:
            payload: Dictionary of input features
            
        Returns:
            Dictionary with predicted_category, confidence, class_probabilities, and shap_values
        """
        try:
            logger.info("Running classification prediction...")
            
            # Prepare DataFrame (raw features matching training columns)
            df = self._prepare_dataframe(payload)
            
            if self._legacy_classification:
                # LEGACY: manually preprocess then predict
                X_processed = self.classification_preprocess.transform(df)
                y_pred = self.classification_model.predict(X_processed)
                proba = self.classification_model.predict_proba(X_processed)[0]
            else:
                # NEW: main_pipeline includes preprocessor
                y_pred = self.classification_pipeline.predict(df)
                proba = self.classification_pipeline.predict_proba(df)[0]
            
            # Decode prediction back to category name
            if self.label_encoder:
                predicted_category = self.label_encoder.inverse_transform(y_pred)[0]
                classes = self.label_encoder.classes_
            else:
                # Legacy fallback: use model.classes_ (numeric labels)
                classes = self.classification_model.classes_
                predicted_category = str(y_pred[0])
            
            # Find the highest probability class
            max_idx = int(np.argmax(proba))
            confidence = float(proba[max_idx])
            
            will_delay = predicted_category not in ("No Delay", "0")
            
            # Build probability dictionary with readable class names
            prob_dict = {
                str(class_name): round(float(prob), 4) 
                for class_name, prob in zip(classes, proba)
            }
            
            # SHAP Feature Importances
            shap_dict = {}
            if self.classification_explainer and self.classification_feature_names:
                try:
                    # Use STANDALONE preprocessor for SHAP
                    X_transformed = self.classification_preprocess.transform(df)
                    shap_values = self.classification_explainer.shap_values(X_transformed)
                    
                    # For multi-class, shap_values is a list of arrays (one per class)
                    if isinstance(shap_values, list):
                        target_class_shap = shap_values[max_idx][0]
                    else:
                        target_class_shap = shap_values[0]
                        
                    for feature_name, val in zip(self.classification_feature_names, target_class_shap):
                        if abs(val) > 0.02:
                            shap_dict[feature_name] = round(float(val), 3)
                except Exception as e:
                    logger.warning(f"Failed to compute SHAP values for classification: {e}")

            logger.info(f"Predicted category: {predicted_category} (confidence: {confidence:.4f})")
            
            return {
                "predicted_category": str(predicted_category),
                "will_delay": bool(will_delay),
                "confidence": round(confidence, 4),
                "class_probabilities": prob_dict,
                "shap_values": shap_dict if shap_dict else None
            }
            
        except Exception as e:
            logger.error(f"Classification prediction failed: {str(e)}", exc_info=True)
            raise
