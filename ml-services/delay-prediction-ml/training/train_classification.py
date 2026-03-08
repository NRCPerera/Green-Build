import pandas as pd
import numpy as np
import joblib
import shap
import warnings
from sklearn.model_selection import train_test_split, KFold
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.ensemble import StackingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

warnings.filterwarnings('ignore')

def categorize_delay(days):
    if pd.isna(days):
        return np.nan
    if days == 0:
        return 'No Delay'
    elif 1 <= days <= 30:
        return 'Minor Delay'
    elif 31 <= days <= 90:
        return 'Major Delay'
    else:
        return 'Critical Delay'

def main():
    print("🚀 Starting Delay Classification Training Pipeline...")

    # 1. Load Data
    try:
        df = pd.read_excel('DataSet.xlsx')
        print(f"✅ Loaded dataset shape: {df.shape}")
    except FileNotFoundError:
        print("❌ Error: DataSet.xlsx not found!")
        return

    # 2. Derive Target and Feature Selection
    target_col = 'Delay_Category'
    
    # Create target classes based on Total_Delay_Days
    df['Total_Delay_Days'] = pd.to_numeric(df['Total_Delay_Days'], errors='coerce')
    df[target_col] = df['Total_Delay_Days'].apply(categorize_delay)

    # Clean rows where target is NaN
    df = df.dropna(subset=[target_col])

    # Drop columns that shouldn't be used for predicting before project completion
    drop_cols = [
        'Project_ID', 'Project_Start_Date', 'Planned_End_Date', 
        'Original_Completion_Date', 'Actual_Duration_Days', 'Is_Delayed', 'Total_Delay_Days'
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

    # Encode Target Labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    print("\n📊 Class Distribution:")
    class_counts = pd.Series(y).value_counts()
    for cat, count in class_counts.items():
        print(f"  - {cat}: {count} samples")

    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
    print(f"\n📊 Train shape: {X_train.shape}, Test shape: {X_test.shape}")

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

    # 4. Ensemble Stacking Model
    # Using XGBoost, RandomForest, and LightGBM as level-0 models
    # Multi-class calibration is handled automatically by these implementations
    base_estimators = [
        ('xgb', XGBClassifier(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1, eval_metric='mlogloss')),
        ('rf', RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)),
        ('lgbm', LGBMClassifier(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1, class_weight='balanced'))
    ]

    # Meta-learner
    stacking_classifier = StackingClassifier(
        estimators=base_estimators,
        final_estimator=LogisticRegression(max_iter=500),
        cv=KFold(n_splits=5, shuffle=True, random_state=42),
        stack_method='predict_proba', # Uses probabilities to train meta-learner
        passthrough=False
    )

    main_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('model', stacking_classifier)
    ])

    # 5. Training
    print("\n⚙️ Training Multi-class Ensemble Model...")
    main_pipeline.fit(X_train, y_train)

    # 6. Evaluation
    y_pred = main_pipeline.predict(X_test)
    y_pred_probs = main_pipeline.predict_proba(X_test)

    acc = accuracy_score(y_test, y_pred)
    
    print("\n📈 Evaluation Metrics:")
    print(f"Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    target_names = label_encoder.classes_
    print(classification_report(y_test, y_pred, target_names=target_names))
    
    print("Sample Predicted Probabilities (First 3 samples):")
    for i in range(3):
        probs = y_pred_probs[i]
        prob_str = ", ".join([f"{target_names[j]}: {p:.3f}" for j, p in enumerate(probs)])
        print(f"Sample {i}: {prob_str} -> Predicted: {target_names[y_pred[i]]}")

    # 7. SHAP Explainability extraction
    print("\n🧠 Generating SHAP Explainer on base XGBoost...")
    X_train_transformed = preprocessor.fit_transform(X_train)
    
    num_cols = numeric_features
    cat_enc = preprocessor.named_transformers_['cat'].named_steps['onehot']
    cat_cols = list(cat_enc.get_feature_names_out(categorical_features))
    feature_names = num_cols + cat_cols

    explainer_model = XGBClassifier(n_estimators=100, max_depth=5, random_state=42, n_jobs=-1, eval_metric='mlogloss')
    explainer_model.fit(X_train_transformed, y_train)
    
    explainer = shap.TreeExplainer(explainer_model)

    # 8. Bundle and Save Artifacts
    bundle = {
        'main_pipeline': main_pipeline,
        'features': numeric_features + categorical_features,
        'preprocessor': preprocessor,
        'explainer_model': explainer_model,
        'feature_names': feature_names,
        'label_encoder': label_encoder
    }

    model_path = 'delay_classification_bundle.joblib'
    joblib.dump(bundle, model_path)
    
    explainer_path = 'classification_explainer.joblib'
    joblib.dump(explainer, explainer_path)

    print(f"\n✅ Successfully saved models to {model_path} and explainer to {explainer_path}!")

if __name__ == "__main__":
    main()
