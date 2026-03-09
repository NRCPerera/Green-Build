import pandas as pd
import numpy as np
import joblib
import shap
import warnings
from sklearn.model_selection import train_test_split, KFold
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import StackingRegressor, RandomForestRegressor
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

warnings.filterwarnings('ignore')

def main():
    print("🚀 Starting Delay Regression Training Pipeline...")

    # 1. Load Data
    try:
        df = pd.read_excel('DataSet.xlsx')
        print(f"✅ Loaded dataset shape: {df.shape}")
    except FileNotFoundError:
        print("❌ Error: DataSet.xlsx not found!")
        return

    # 2. Feature Selection (Avoiding target leakage)
    target_col = 'Total_Delay_Days'
    
    # Drop columns that shouldn't be used for predicting before project completion
    drop_cols = [
        'Project_ID', 'Project_Start_Date', 'Planned_End_Date', 
        'Original_Completion_Date', 'Actual_Duration_Days', 'Is_Delayed'
    ]
    df = df.drop(columns=drop_cols, errors='ignore')

    # Define Feature Sets
    numeric_features = [
        'Floors', 'Contractor_Experience_Years', 'Contractor_Previous_Projects',
        'Contractor_Past_Delay_Rate', 'Labour_Pool_Size', 'Labour_Assigned_To_Project',
        'Planned_Duration_Days', 'Weather_Impact_Days', 'Design_Change_Orders',
        'Material_Delivery_Delay_Days', 'Payment_Delay_Days'
    ]
    
    categorical_features = [
        'Project_Type', 'Province', 'District', 'Location',
        'Contractor_ICTAD_Grade', 'Start_Season', 'Payment_Delay_History'
    ]

    X = df[numeric_features + categorical_features]
    y = df[target_col]

    # Handle any potential remaining strings in target
    y = pd.to_numeric(y, errors='coerce')
    
    # Clean rows where target is NaN
    valid_idx = y.notna()
    X = X[valid_idx]
    y = y[valid_idx]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # ----------------------------------------------------
    # OVERSAMPLING: Boost representation of "On Time" (0 delay) projects
    # This prevents the model from safely regressing to the high dataset mean 
    # when given perfect/low-risk project parameters.
    # ----------------------------------------------------
    zero_mask = (y_train <= 0)
    if zero_mask.sum() > 0:
        X_train_zeros = X_train[zero_mask]
        y_train_zeros = y_train[zero_mask]
        
        # Duplicate 0-delay projects aggressively to strong-arm the model
        multiplier = 50
        X_train = pd.concat([X_train] + [X_train_zeros] * multiplier, ignore_index=True)
        y_train = pd.concat([y_train] + [y_train_zeros] * multiplier, ignore_index=True)
        print(f"🔄 Oversampled {zero_mask.sum()} '0-delay' projects {multiplier}x to anchor low-risk predictions.")
    # ----------------------------------------------------
    
    print(f"📊 Train shape: {X_train.shape}, Test shape: {X_test.shape}")

    # 3. Preprocessing
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ]
    )

    # 4. Ensemble Stacking Model (Main Prediction - Most Likely)
    # Using XGBoost, RandomForest, and LightGBM as level-0 models
    base_estimators = [
        ('xgb', XGBRegressor(n_estimators=150, learning_rate=0.05, max_depth=6, random_state=42, n_jobs=-1)),
        ('rf', RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)),
        ('lgbm', LGBMRegressor(n_estimators=150, learning_rate=0.05, max_depth=6, random_state=42, n_jobs=-1))
    ]

    # Meta-learner
    stacking_regressor = StackingRegressor(
        estimators=base_estimators,
        final_estimator=RidgeCV(),
        cv=KFold(n_splits=5, shuffle=True, random_state=42),
        passthrough=False
    )

    main_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('model', stacking_regressor)
    ])

    # 5. Quantile Regression (For P10 Best Case and P90 Worst Case uncertainty quantification)
    print("⚙️ Training Ensemble Main Model...")
    main_pipeline.fit(X_train, y_train)

    print("⚙️ Training Quantile Regression (P10 -> Best Case)...")
    p10_model = LGBMRegressor(objective='quantile', alpha=0.1, n_estimators=100, random_state=42, n_jobs=-1)
    p10_pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('model', p10_model)])
    p10_pipeline.fit(X_train, y_train)

    print("⚙️ Training Quantile Regression (P90 -> Worst Case)...")
    p90_model = LGBMRegressor(objective='quantile', alpha=0.9, n_estimators=100, random_state=42, n_jobs=-1)
    p90_pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('model', p90_model)])
    p90_pipeline.fit(X_train, y_train)

    # 6. Evaluation
    y_pred_main = main_pipeline.predict(X_test)
    y_pred_p10 = p10_pipeline.predict(X_test)
    y_pred_p90 = p90_pipeline.predict(X_test)

    r2 = r2_score(y_test, y_pred_main)
    mae = mean_absolute_error(y_test, y_pred_main)
    rmse = root_mean_squared_error(y_test, y_pred_main)

    print("\n📈 Evaluation Metrics (Ensemble Point Estimate):")
    print(f"R² Score: {r2:.4f}")
    print(f"MAE:      {mae:.2f} Days")
    print(f"RMSE:     {rmse:.2f} Days")

    # Show confidence interval widths check
    ci_width = np.mean(y_pred_p90 - y_pred_p10)
    print(f"Average P90 - P10 Interval Width: {ci_width:.2f} Days")

    # 7. SHAP Explainability extraction (DISABLED to bypass XGBoost parsing errors)
    print("\n🧠 Skipping SHAP Explainer...")
    explainer_model = None
    explainer = None

    # 8. Bundle and Save Artifacts
    bundle = {
        'main_pipeline': main_pipeline,
        'p10_pipeline': p10_pipeline,
        'p90_pipeline': p90_pipeline,
        'features': numeric_features + categorical_features,
        'preprocessor': preprocessor,
        'explainer_model': None,
        'feature_names': []
    }

    model_path = 'delay_regression_bundle.joblib'
    joblib.dump(bundle, model_path)
    
    explainer_path = 'regression_explainer.joblib'
    joblib.dump(explainer, explainer_path)

    print(f"\n✅ Successfully saved models to {model_path} and explainer to {explainer_path}!")

if __name__ == "__main__":
    main()
