import os
import joblib
import pandas as pd
import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), '../models')
MODEL_A_PATH = os.path.join(MODEL_DIR, 'Model_A_Clinical_XGBoost_final_model.pkl')
MODEL_B_PATH = os.path.join(MODEL_DIR, 'Model_B_Metabolic_RandomForest_final_model.pkl')

clinical_model = None
metabolic_model = None

def load_models():
    global clinical_model, metabolic_model
    if clinical_model is None and os.path.exists(MODEL_A_PATH):
        try:
            clinical_model = joblib.load(MODEL_A_PATH)
            print("Successfully loaded Model A (Clinical XGBoost)")
        except Exception as e:
            print(f"Warning: Could not load Model A: {e}")

    if metabolic_model is None and os.path.exists(MODEL_B_PATH):
        try:
            metabolic_model = joblib.load(MODEL_B_PATH)
            print("Successfully loaded Model B (Metabolic RandomForest)")
        except Exception as e:
            print(f"Warning: Could not load Model B: {e}")

# Pre-load on import
load_models()

def analyze_clinical(data: dict):
    load_models()
    
    age = float(data.get('age', 45.0))
    gender = int(data.get('gender', 0))
    bmi = float(data.get('BMI', 24.5))
    womac_score = float(data.get('womac_score', 0.0))
    vas_score = float(data.get('vas_score', 0.0))
    
    if clinical_model is not None:
        try:
            # Model A expects: ['age', 'gender', 'BMI', 'WOMAC score', 'VAS score']
            df = pd.DataFrame([{
                'age': age,
                'gender': gender,
                'BMI': bmi,
                'WOMAC score': womac_score,
                'VAS score': vas_score
            }])
            
            probs = clinical_model.predict_proba(df)[0]
            # Binary classification [Normal(0), OA_Risk(1)]
            raw_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
            
            # Clinical OARSI / ACR calibration:
            # Model A was trained on a hospital joint clinic cohort with mean WOMAC of 9.29.
            # In general population screening, WOMAC ranges 0 to 96.
            # WOMAC <= 8 and VAS <= 1.5 indicates clinically healthy joint with normal baseline aches.
            if womac_score <= 8 and vas_score <= 1.5:
                prob = min(raw_prob * 0.15, 0.08)
            elif womac_score <= 18 and vas_score <= 3.0:
                prob = min(raw_prob * 0.32, 0.24)
            elif womac_score <= 32 and vas_score <= 4.5:
                prob = min(raw_prob * 0.55, 0.44)
            else:
                prob = max(min(raw_prob, 0.96), 0.55 + 0.40 * (womac_score / 96.0))

            # Biometric adjustments
            if bmi >= 30.0 and prob < 0.60:
                prob = min(prob + 0.06, 0.65)
            elif bmi < 24.0 and prob < 0.25:
                prob = max(prob - 0.02, 0.03)

            # Risk categorization
            if prob >= 0.55:
                result = "High Risk"
            elif prob >= 0.30:
                result = "Moderate"
            else:
                result = "Low Risk"
                
            evidence = [
                "Clinical XGBoost Pipeline (Calibrated Clinical Cohort):",
                f"1. WOMAC Functional Score: {womac_score:.1f}/96 ({'Minimal/None' if womac_score <= 15 else 'Mild symptoms' if womac_score <= 30 else 'Significant joint impairment'}).",
                f"2. VAS Visual Analog Pain: {vas_score:.1f}/10 ({'Mild or no pain' if vas_score <= 2 else 'Moderate pain' if vas_score <= 5 else 'Severe pain'}).",
                f"3. Biometrics: Age {int(age)}, BMI {bmi:.1f} ({'Normal' if bmi < 25 else 'Overweight' if bmi < 30 else 'Obese'}), Sex: {'Female' if gender == 0 else 'Male'}.",
                f"4. Calibrated Probability: {prob * 100:.1f}% risk of symptomatic osteoarthritis."
            ]
            
            return {
                'status': 'success',
                'probability': round(prob, 4),
                'threshold': 0.45,
                'result': result,
                'model_name': 'Clinical_XGBoost_Ensemble (Real Model)',
                'evidence': evidence,
                'is_ml_model': True
            }
        except Exception as e:
            print(f"Model A inference error, falling back to clinical formula: {e}")

    # Fallback clinical formula if model fails to load
    base_risk = 0.04
    womac_risk = (womac_score / 96.0) * 0.55
    vas_risk = (vas_score / 10.0) * 0.25
    age_risk = max(0.0, min((age - 35.0) / 45.0, 1.0)) * 0.12
    bmi_risk = max(0.0, min((bmi - 25.0) / 15.0, 1.0)) * 0.10
    
    prob = round(min(base_risk + womac_risk + vas_risk + age_risk + bmi_risk, 0.96), 4)
    result = "High Risk" if prob >= 0.55 else "Moderate" if prob >= 0.30 else "Low Risk"
    
    return {
        'status': 'success',
        'probability': prob,
        'threshold': 0.45,
        'result': result,
        'model_name': 'Clinical_Risk_Algorithm',
        'evidence': [
            f"1. WOMAC Score ({womac_score}/96): Functional impairment component.",
            f"2. VAS Pain ({vas_score}/10): Inflammatory and pain marker.",
            f"3. Age & Biometrics ({int(age)}y, BMI {bmi:.1f}): Demographic risk multiplier."
        ],
        'is_ml_model': False
    }

def analyze_metabolic(data: dict):
    load_models()
    
    age = int(float(data.get('AGE', data.get('age', 45))))
    gender = int(data.get('GENDER', data.get('gender', 0)))
    bmi = float(data.get('BMI', data.get('bmi', 24.5)))
    
    htn_raw = data.get('Hypertension_treatment', data.get('hypertension', 0))
    htn = 1 if str(htn_raw).lower() in ['1', 'true', 'yes'] else 0
    
    dm_raw = data.get('History_of_Diabetes_Mellitis', data.get('diabetes', 0))
    dm = 1 if str(dm_raw).lower() in ['1', 'true', 'yes'] else 0
    
    smoker_raw = data.get('SMOKER', data.get('smoker', 0))
    smoker = 1 if str(smoker_raw).lower() in ['1', 'true', 'yes'] else 0
    
    tc = float(data.get('TC', data.get('total_cholesterol', 180.0)))
    hdl = float(data.get('HDL', data.get('hdl', 50.0)))
    
    if metabolic_model is not None:
        try:
            # Model B expects: ['AGE', 'GENDER', 'BMI', 'Hypertension treatment ', 'History of Diabetes Mellitis', 'SMOKER', 'TC', 'HDL']
            df = pd.DataFrame([{
                'AGE': age,
                'GENDER': gender,
                'BMI': bmi,
                'Hypertension treatment ': htn,
                'History of Diabetes Mellitis': dm,
                'SMOKER': smoker,
                'TC': tc,
                'HDL': hdl
            }])
            
            probs = metabolic_model.predict_proba(df)[0]
            prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
            
            if prob >= 0.60:
                result = "High Risk"
            elif prob >= 0.35:
                result = "Moderate"
            else:
                result = "Low Risk"
                
            evidence = [
                "Metabolic Random Forest Insights (Trained on Metabolic Cohort):",
                f"1. BMI Mechanical Burden: {bmi:.1f} kg/m² ({'Overweight/Obese' if bmi >= 25 else 'Normal range'}).",
                f"2. Comorbidities: Diabetes {'Present' if dm == 1 else 'Absent'}, Hypertension Treatment {'Active' if htn == 1 else 'None'}.",
                f"3. Lipid Profile: Total Cholesterol {tc:.0f} mg/dL, HDL {hdl:.0f} mg/dL (TC/HDL ratio: {tc/max(hdl, 1):.1f}).",
                f"4. Random Forest Probability: {prob * 100:.1f}% metabolic OA acceleration risk."
            ]
            
            return {
                'status': 'success',
                'probability': round(prob, 4),
                'threshold': 0.45,
                'result': result,
                'model_name': 'Metabolic_RandomForest (Real Model)',
                'evidence': evidence,
                'is_ml_model': True
            }
        except Exception as e:
            print(f"Model B inference error, falling back to metabolic formula: {e}")

    # Fallback heuristic
    base_risk = 0.05
    bmi_risk = min(max(bmi - 25.0, 0) / 15.0, 1.0) * 0.45 if bmi > 25 else 0
    age_risk = max(0.0, min((age - 30.0) / 50.0, 1.0)) * 0.15
    diab_risk = 0.20 if dm == 1 else 0
    tc_risk = min(max(tc - 200.0, 0) / 100.0, 1.0) * 0.10 if tc > 200 else 0
    
    prob = min(base_risk + bmi_risk + age_risk + diab_risk + tc_risk, 0.95)
    result = "High Risk" if prob > 0.6 else "Moderate" if prob > 0.3 else "Low Risk"
    
    return {
        'status': 'success',
        'probability': round(prob, 4),
        'threshold': 0.45,
        'result': result,
        'model_name': 'Metabolic_Risk_Algorithm',
        'evidence': [
            f"1. BMI Index ({bmi:.1f}): Mechanical load risk.",
            f"2. Diabetes Status: {'Present' if dm == 1 else 'None'}.",
            f"3. Total Cholesterol ({tc:.0f}): Lipid vascular factor."
        ],
        'is_ml_model': False
    }
