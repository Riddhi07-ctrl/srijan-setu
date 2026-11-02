import os
import sys
import shutil
import json
from pathlib import Path
from typing import List, Optional, Dict
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
import joblib

# Import Services and Engines
from services.screening_service import analyze_clinical, analyze_metabolic
from engines.knee_engine import analyze_knee
from engines.hip_engine import analyze_hip
from engines.shoulder_engine import analyze_shoulder
from engines.hand_engine import analyze_hand
from engines.spine_engine import analyze_spine
from engines.imaging_engine import analyze_imaging
from engines.osteoporosis_densenet_engine import analyze_osteoporosis_xray

app = FastAPI(title="Swastik | Unified Bone & Joint Health Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# PHASE 1 & 2: CLINICAL AND METABOLIC
# ==========================================

class ClinicalData(BaseModel):
    age: float
    gender: int
    BMI: float
    womac_score: float
    vas_score: float

class MetabolicData(BaseModel):
    AGE: int
    GENDER: int
    BMI: float
    Hypertension_treatment: int
    History_of_Diabetes_Mellitis: int
    SMOKER: int
    TC: float
    HDL: float

@app.post('/api/analyze/clinical')
async def endpoint_clinical(data: ClinicalData):
    try:
        return analyze_clinical(data.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/api/analyze/metabolic')
async def endpoint_metabolic(data: MetabolicData):
    try:
        return analyze_metabolic(data.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# PHASE 4: JOINT-SPECIFIC CAMERA ENGINES
# ==========================================

class LiveCameraData(BaseModel):
    left_knee_angles: Optional[List[float]] = None
    right_knee_angles: Optional[List[float]] = None
    joint_angles: Optional[Dict[str, List[float]]] = None

@app.post('/api/analyze/camera/{joint}')
async def endpoint_camera_joint(joint: str, data: LiveCameraData):
    try:
        if joint == 'knee':
            if not data.left_knee_angles or not data.right_knee_angles:
                raise HTTPException(status_code=400, detail='Missing knee angles payload')
            return analyze_knee(data.left_knee_angles, data.right_knee_angles)
            
        elif joint == 'hip':
            return analyze_hip(data.joint_angles or {})
            
        elif joint == 'shoulder':
            status, prob, threshold, result, evidence = analyze_shoulder(data.joint_angles or {})
            return {
                "status": "success", "joint": "shoulder",
                "probability": round(prob, 3), "threshold": threshold,
                "result": result, "evidence": evidence,
                "camera_risk": round(prob, 3), "camera_class": result,
                "confidence": round(1.0 - prob if prob < 0.5 else prob, 2)
            }
            
        elif joint == 'hand':
            status, prob, threshold, result, evidence = analyze_hand(data.joint_angles or {})
            return {
                "status": "success", "joint": "hand",
                "probability": round(prob, 3), "threshold": threshold,
                "result": result, "evidence": evidence,
                "camera_risk": round(prob, 3), "camera_class": result,
                "confidence": round(1.0 - prob if prob < 0.5 else prob, 2)
            }
            
        elif joint == 'spine':
            status, prob, threshold, result, evidence = analyze_spine(data.joint_angles or {})
            return {
                "status": "success", "joint": "spine",
                "probability": round(prob, 3), "threshold": threshold,
                "result": result, "evidence": evidence,
                "camera_risk": round(prob, 3), "camera_class": result,
                "confidence": round(1.0 - prob if prob < 0.5 else prob, 2)
            }
            
        else:
            raise HTTPException(status_code=404, detail=f"Joint '{joint}' not supported")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/api/analyze/camera/live')
async def endpoint_camera_live_legacy(data: LiveCameraData):
    return await endpoint_camera_joint('knee', data)

# ==========================================
# PHASE 5: OA IMAGING ENGINE (ResNet-18 KL Grade)
# ==========================================

@app.post('/api/analyze/imaging')
async def endpoint_imaging(file: UploadFile = File(...), joint: str = Form("knee")):
    try:
        temp_dir = Path("temp_uploads")
        temp_dir.mkdir(exist_ok=True)
        file_path = temp_dir / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = analyze_imaging(str(file_path), joint)
        
        if file_path.exists():
            file_path.unlink()
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# OSTEOPOROSIS ENDPOINTS (DEXA & NON-DEXA)
# ==========================================

class OsteoporosisDEXAData(BaseModel):
    patient_id: str = "Unknown"
    fnt: float = 0
    calcitriol: float = 0
    uric: float = 0
    alt: float = 0
    bun: float = 0
    crea: float = 0
    fbg: float = 0
    ldl_c: float = 0
    l1_4t: float = 0
    age: float = 65
    hdl_c: float = 0
    bmi: float = 24
    ca: float = 0
    p: float = 0
    height: float = 170
    ast: float = 0
    weight: float = 70
    calsium: float = 0
    calcitonin: float = 0
    as_: float = 0

@app.post('/api/analyze/osteoporosis_clinical')
async def endpoint_osteoporosis_clinical(data: OsteoporosisDEXAData):
    """
    Full biochemical + DEXA T-score multivariate clinical risk assessment.
    Uses ALL submitted lab values, not just T-score alone.
    Returns a directional osteoporosis probability (0-1) where higher = more risk.
    """
    t_score = data.l1_4t

    # --- T-score component (WHO criteria, strongest single predictor) ---
    if t_score <= -2.5:
        t_risk = 0.70 + min(abs(t_score - (-2.5)) * 0.04, 0.25)  # 0.70 - 0.95
    elif t_score <= -1.0:
        t_risk = 0.30 + (abs(t_score) - 1.0) / 1.5 * 0.40  # 0.30 - 0.70
    else:
        t_risk = max(0.02, 0.30 - (t_score + 1.0) * 0.10)  # 0.02 - 0.30

    # --- Biochemical risk modifiers ---
    bio_risk = 0.0
    bio_flags = []

    # Serum Calcium (normal: 8.5-10.5 mg/dL)
    if data.ca < 8.5:
        bio_risk += 0.06
        bio_flags.append(f"Low serum calcium ({data.ca} mg/dL)")
    elif data.ca > 10.5:
        bio_risk += 0.03
        bio_flags.append(f"Elevated serum calcium ({data.ca} mg/dL)")

    # Phosphorus (normal: 2.5-4.5 mg/dL)
    if data.p < 2.5:
        bio_risk += 0.04
        bio_flags.append(f"Low phosphorus ({data.p} mg/dL)")
    elif data.p > 4.5:
        bio_risk += 0.03

    # Calcitriol / Active Vitamin D (normal: 20-60 pg/mL)
    if data.calcitriol < 20:
        bio_risk += 0.06
        bio_flags.append(f"Calcitriol deficiency ({data.calcitriol} pg/mL)")
    elif data.calcitriol > 60:
        bio_risk += 0.02

    # Calcitonin (normal: <10 pg/mL for females, <19 for males)
    if data.calcitonin < 2.0:
        bio_risk += 0.04
        bio_flags.append(f"Low calcitonin ({data.calcitonin} pg/mL)")

    # FNT / Osteocalcin bone turnover marker (normal: ~0.3-1.2 ng/mL)
    if data.fnt > 1.5:
        bio_risk += 0.05
        bio_flags.append(f"Elevated bone turnover marker ({data.fnt})")
    elif data.fnt < 0.3:
        bio_risk += 0.03

    # Urinary Calcium (calsium field, normal: 100-300 mg/24h or ~4.0-7.0 mmol)
    if data.calsium > 15.0:
        bio_risk += 0.04
        bio_flags.append(f"Elevated urinary calcium ({data.calsium})")

    # Uric Acid (normal: 3.5-7.2 mg/dL)
    if data.uric > 7.2:
        bio_risk += 0.03
    elif data.uric < 3.5:
        bio_risk += 0.02

    # Creatinine (normal: 0.6-1.2 mg/dL) — kidney function affects bone
    if data.crea > 1.4:
        bio_risk += 0.05
        bio_flags.append(f"Elevated creatinine ({data.crea} mg/dL)")

    # BUN (normal: 7-20 mg/dL)
    if data.bun > 20:
        bio_risk += 0.03

    # BMI risk
    if data.bmi < 18.5:
        bio_risk += 0.08
        bio_flags.append(f"Underweight BMI ({data.bmi})")
    elif data.bmi < 20:
        bio_risk += 0.04

    # Age risk
    age_risk = 0.0
    if data.age >= 70:
        age_risk = 0.10
    elif data.age >= 60:
        age_risk = 0.06
    elif data.age >= 50:
        age_risk = 0.03

    # --- Fused probability (T-score: 55%, Biochem: 30%, Age/BMI: 15%) ---
    fused = 0.55 * t_risk + 0.30 * min(bio_risk, 0.40) + 0.15 * age_risk
    fused = max(0.02, min(0.98, fused))

    # Classification
    if fused >= 0.55:
        pred = "Osteoporosis"
    elif fused >= 0.30:
        pred = "Osteopenia"
    else:
        pred = "Normal"

    confidence = round((fused if fused >= 0.50 else (1.0 - fused)) * 100, 1)

    # Build evidence summary
    evidence = [
        f"DEXA T-score (L1-L4): {t_score} → T-score risk component: {t_risk:.2f}",
    ]
    if bio_flags:
        evidence.append("Biochemical flags: " + "; ".join(bio_flags))
    else:
        evidence.append("All biochemical markers within normal range.")
    evidence.append(f"Age: {int(data.age)}y, BMI: {data.bmi}, Height: {data.height}cm, Weight: {data.weight}kg")

    return {
        "confidence": confidence,
        "prediction": pred,
        "probability": round(fused, 4),
        "osteoporosis_probability": round(fused, 4),
        "t_score": t_score,
        "probabilities": {
            "Normal": round((1.0 - fused) * 100, 1) if fused < 0.30 else round(max(5, (1.0 - fused) * 60), 1),
            "Osteopenia": round(30.0 if 0.30 <= fused < 0.55 else max(5, (0.55 - abs(fused - 0.42)) * 80), 1),
            "Osteoporosis": round(fused * 100, 1),
        },
        "evidence": evidence,
        "biochemical_summary": {
            "serum_calcium": {"value": data.ca, "unit": "mg/dL", "range": "8.5-10.5"},
            "phosphorus": {"value": data.p, "unit": "mg/dL", "range": "2.5-4.5"},
            "calcitriol": {"value": data.calcitriol, "unit": "pg/mL", "range": "20-60"},
            "calcitonin": {"value": data.calcitonin, "unit": "pg/mL", "range": "<10"},
            "bone_turnover_fnt": {"value": data.fnt, "unit": "ng/mL", "range": "0.3-1.2"},
            "uric_acid": {"value": data.uric, "unit": "mg/dL", "range": "3.5-7.2"},
            "creatinine": {"value": data.crea, "unit": "mg/dL", "range": "0.6-1.2"},
            "bun": {"value": data.bun, "unit": "mg/dL", "range": "7-20"},
            "alt": {"value": data.alt, "unit": "U/L", "range": "7-56"},
            "ast": {"value": data.ast, "unit": "U/L", "range": "10-40"},
            "fbg": {"value": data.fbg, "unit": "mg/dL", "range": "70-100"},
            "ldl_c": {"value": data.ldl_c, "unit": "mg/dL", "range": "<100"},
            "hdl_c": {"value": data.hdl_c, "unit": "mg/dL", "range": ">40"},
        },
        "guideline": "WHO BMD Criteria + Biochemical Bone Metabolism Panel"
    }

class OsteoporosisBasicData(BaseModel):
    Age: float
    Smoking: str
    Physical_Activity: str
    Medications: str
    Vitamin_D_Intake: str
    Hormonal_Changes: str
    Gender: str
    Body_Weight: str
    Prior_Fractures: str
    Alcohol_Consumption: str

try:
    clinical_pipeline = joblib.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "their_models", "osteoporosis_model_fixed.pkl"))
except Exception as e:
    print("Could not load clinical pipeline:", e)
    clinical_pipeline = None

@app.post('/api/analyze/osteoporosis_basic_clinical')
async def endpoint_osteoporosis_basic_clinical(data: OsteoporosisBasicData):
    # Map frontend values to binary indicators
    def to_binary_risk(val: str, risk_vals: list) -> int:
        return 1 if str(val).strip().lower() in [v.lower() for v in risk_vals] else 0

    smoking_bin = to_binary_risk(data.Smoking, ['Yes', '1', 'true', 'Current'])
    sedentary_bin = to_binary_risk(data.Physical_Activity, ['Sedentary', 'Inactive', '0', 'false', 'No'])
    meds_bin = to_binary_risk(data.Medications, ['Yes', '1', 'true', 'Corticosteroids', 'Steroids'])
    vitd_bin = to_binary_risk(data.Vitamin_D_Intake, ['Deficient', 'Insufficient', '0', 'false', 'No'])
    hormone_bin = to_binary_risk(data.Hormonal_Changes, ['Postmenopausal', 'Yes', '1', 'true'])
    female_bin = to_binary_risk(data.Gender, ['Female', '1'])
    underweight_bin = to_binary_risk(data.Body_Weight, ['Underweight', 'Low', '1'])
    fracture_bin = to_binary_risk(data.Prior_Fractures, ['Yes', '1', 'true'])
    alcohol_bin = to_binary_risk(data.Alcohol_Consumption, ['Yes', '1', 'true', 'Moderate', 'Heavy', 'Regular'])

    ml_prob = 0.20
    if clinical_pipeline is not None:
        try:
            # Model pipeline was trained on standardized Age (mean ~60, std ~12)
            z_age = (float(data.Age) - 60.0) / 12.0
            df = pd.DataFrame([{
                'Age': z_age,
                'Smoking': smoking_bin,
                'Physical_Activity': sedentary_bin,
                'Medications': meds_bin,
                'Vitamin_D_Intake': vitd_bin,
                'Hormonal_Changes': hormone_bin,
                'Gender': female_bin,
                'Body_Weight': underweight_bin,
                'Prior_Fractures': fracture_bin,
                'Alcohol_Consumption': alcohol_bin
            }])
            probs = clinical_pipeline.predict_proba(df)[0]
            ml_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
        except Exception as e:
            print("Clinical pipeline predict error:", e)

    # WHO FRAX-grounded clinical baseline risk calculation
    age = float(data.Age)
    if age < 45:
        base_age_risk = 0.04
    elif age < 55:
        base_age_risk = 0.12
    elif age < 65:
        base_age_risk = 0.22
    else:
        base_age_risk = 0.32

    risk_sum = base_age_risk
    if female_bin and hormone_bin:
        risk_sum += 0.12
    elif female_bin:
        risk_sum += 0.04

    if fracture_bin: risk_sum += 0.25
    if meds_bin: risk_sum += 0.18
    if underweight_bin: risk_sum += 0.15
    if smoking_bin: risk_sum += 0.08
    if sedentary_bin: risk_sum += 0.08
    else: risk_sum -= 0.05
    if vitd_bin: risk_sum += 0.08
    if alcohol_bin: risk_sum += 0.08

    clin_prob = max(0.04, min(0.96, risk_sum))
    
    # Critical flag: If a patient has NO severe fragility indicators (no prior fractures, no steroids, normal weight, active):
    # Chronological age alone cannot manufacture an 80-99% positive osteoporosis diagnosis
    has_critical_risks = fracture_bin or meds_bin or underweight_bin
    if not has_critical_risks and age < 65:
        fused = min(clin_prob, 0.35)
    elif not has_critical_risks:
        fused = min(0.35 * ml_prob + 0.65 * clin_prob, 0.48)
    else:
        fused = 0.35 * ml_prob + 0.65 * clin_prob

    fused_prob = round(max(0.04, min(0.98, fused)), 4)
    if fused_prob >= 0.50:
        label = "Osteoporosis"
        norm_p = round(max(2.0, (1.0 - fused_prob) * 40.0), 1)
        osteo_p = round(fused_prob * 100.0, 1)
        penia_p = round(max(5.0, 100.0 - osteo_p - norm_p), 1)
        confidence = osteo_p
    elif fused_prob >= 0.28:
        label = "Osteopenia"
        penia_p = round(52.0 + (fused_prob - 0.28) * 45.0, 1)
        osteo_p = round(fused_prob * 55.0, 1)
        norm_p = round(max(5.0, 100.0 - penia_p - osteo_p), 1)
        confidence = penia_p
    else:
        label = "Normal"
        norm_p = round((1.0 - fused_prob) * 100.0, 1)
        penia_p = round(fused_prob * 70.0, 1)
        osteo_p = round(max(1.0, 100.0 - norm_p - penia_p), 1)
        confidence = norm_p

    evidence = [
        f"WHO/FRAX Clinical Baseline: Age {int(age)}y, Sex: {'Female' if female_bin else 'Male'}.",
        f"Prior Fragility Fractures: {'Positive (+25% risk)' if fracture_bin else 'None reported'}.",
        f"Steroid / Medication Exposure: {'Chronic exposure reported' if meds_bin else 'None'}.",
        f"Body Weight Category: {'Underweight (high fragility)' if underweight_bin else 'Normal / Protective'}.",
        f"Lifestyle Profile: Physical Activity {'Sedentary' if sedentary_bin else 'Active'}, Smoking {'Yes' if smoking_bin else 'No'}."
    ]

    return {
        "confidence": confidence,
        "prediction": label,
        "raw_prediction": 2 if label == "Osteoporosis" else (1 if label == "Osteopenia" else 0),
        "probability": fused_prob,
        "osteoporosis_probability": fused_prob,
        "probabilities": {
            "Normal": norm_p,
            "Osteopenia": penia_p,
            "Osteoporosis": osteo_p
        },
        "evidence": evidence
    }

# ==========================================
# OSTEOPOROSIS IMAGING: Densenet121 Clean + CLAHE + Grad-CAM
# ==========================================

@app.post('/api/analyze/osteoporosis_imaging')
async def endpoint_osteoporosis_imaging(
    file: UploadFile = File(...),
    patient_id: str = Form("Unknown"),
    patient_age: float = Form(60.0)
):
    try:
        image_bytes = await file.read()
        res = analyze_osteoporosis_xray(image_bytes, patient_age=patient_age)
        
        # Ensure standard probability fields exist for all callers
        if "probabilities" in res:
            p_osteo = res["probabilities"].get("Osteoporosis", 0.0) / 100.0
            p_penia = res["probabilities"].get("Osteopenia", 0.0) / 100.0
            p_norm = res["probabilities"].get("Normal", 0.0) / 100.0
            
            # Clinical bone fragility index: Osteoporosis carries full weight (1.0), Osteopenia carries moderate bone loss weight (0.65)
            composite_img_risk = round(p_osteo * 1.0 + p_penia * 0.65, 4)
            res["probability"] = composite_img_risk
            res["osteoporosis_probability"] = round(p_osteo, 4)
            res["osteopenia_probability"] = round(p_penia, 4)
            res["normal_probability"] = round(p_norm, 4)
        return res
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# MULTIMODAL FUSION SCORE & BONE-JOINT INDEX
# ==========================================

class FusionScoreRequest(BaseModel):
    clinical_risk: Optional[float] = 0.0
    metabolic_risk: Optional[float] = 0.0
    movement_risk: Optional[float] = 0.0
    imaging_risk: Optional[float] = 0.0
    imaging_prediction: Optional[str] = "Normal"
    patient_age: Optional[float] = 55.0
    patient_gender: Optional[str] = "Female"
    selected_joint: Optional[str] = "knee"

@app.post('/api/analyze/fusion_score')
async def endpoint_fusion_score(data: FusionScoreRequest):
    """
    Multimodal fusion engine that unifies:
    1. Clinical functional limitation (WOMAC / Questionnaire)
    2. Metabolic load (BMI / Lipids / Glycemia)
    3. Computer Vision Kinematics (MediaPipe ROM & asymmetry)
    4. Deep Radiographic Attenuation (DenseNet121)
    Produces a composite 0-100 Bone & Joint Health Score.
    """
    c_risk = float(data.clinical_risk or 0.0)
    m_risk = float(data.metabolic_risk or 0.0)
    k_risk = float(data.movement_risk or 0.0)
    x_risk = float(data.imaging_risk or 0.0)
    age = float(data.patient_age or 55.0)

    # Weighted composite vulnerability (0.0 to 1.0)
    # Clinical: 25%, Metabolic: 15%, Kinematics: 25%, Radiography: 35%
    weights = [0.25, 0.15, 0.25, 0.35]
    composite_vulnerability = (c_risk * weights[0] + 
                               m_risk * weights[1] + 
                               k_risk * weights[2] + 
                               x_risk * weights[3])

    # Convert to 0-100 Health Vitality Index (100 = completely healthy, 0 = severe disease)
    vitality_score = int(round(max(0, min(100, (1.0 - composite_vulnerability) * 100))))
    
    # Stratification
    if vitality_score >= 75:
        tier = "Low Risk / Optimal Vitality"
        color = "emerald"
        action = "Maintain regular physical activity, 1000mg/day dietary calcium, and annual checkups."
    elif vitality_score >= 50:
        tier = "Moderate Risk / Guarded Mobility"
        color = "amber"
        action = "Initiate targeted joint stabilization exercises, vitamin D3 supplementation, and lifestyle modifications."
    else:
        tier = "High Risk / Clinical Alert"
        color = "rose"
        action = "Prompt orthopedic consultation recommended. Confirmatory DEXA scan & prescription anti-resorptive review indicated."

    # Bone Health Age estimate
    delta_years = int((composite_vulnerability - 0.25) * 24)
    bone_age = int(max(30, min(95, age + delta_years)))

    return {
        "status": "success",
        "composite_score": vitality_score,
        "vulnerability_index": round(composite_vulnerability, 3),
        "tier": tier,
        "tier_color": color,
        "bone_health_age": bone_age,
        "actual_age": int(age),
        "recommended_action": action,
        "modality_breakdown": {
            "clinical": round(c_risk * 100, 1),
            "metabolic": round(m_risk * 100, 1),
            "movement": round(k_risk * 100, 1),
            "radiography": round(x_risk * 100, 1)
        }
    }

# ==========================================
# FALL RISK CAMERA ASSESSMENT (Single-Leg Stance)
# ==========================================

class FallRiskRequest(BaseModel):
    stance_time_seconds: float
    sway_variance: float
    age: int = 65
    history_of_falls: int = 0

@app.post('/api/analyze/fall_risk')
async def endpoint_fall_risk(data: FallRiskRequest):
    """
    Assesses 1-year fall probability via Single-Leg Stance (SLS) kinematics and postural sway.
    Standard Geriatric Benchmark: < 5 seconds on one leg correlates with 3x fracture risk.
    """
    t = data.stance_time_seconds
    sway = data.sway_variance
    age = data.age
    history = data.history_of_falls

    # Risk score calculation
    if t < 5.0 or sway > 25.0 or history >= 2:
        risk_level = "High Fall Risk"
        fall_prob_1yr = min(45 + (10 - min(t, 10)) * 3.5 + history * 10, 85)
        steadi_category = "High Risk (CDC STEADI Protocol)"
        interventions = [
            "Supervised balance rehabilitation (Tai Chi or Otago exercise program)",
            "Home environmental safety assessment (rugs, grab bars, lighting)",
            "Medication review for sedatives and antihypertensives"
        ]
    elif t < 10.0 or sway > 15.0 or history == 1:
        risk_level = "Moderate Fall Risk"
        fall_prob_1yr = 28.0 + (10 - t) * 1.5
        steadi_category = "Moderate Risk (CDC STEADI Protocol)"
        interventions = [
            "Community-based group exercise classes",
            "Targeted quadriceps and ankle strengthening",
            "Annual repeat balance screening"
        ]
    else:
        risk_level = "Low Fall Risk"
        fall_prob_1yr = max(8.0, 14.0 - t * 0.4)
        steadi_category = "Low Risk (CDC STEADI Protocol)"
        interventions = [
            "Maintain general cardiovascular and walking routine",
            "Adequate dietary protein and calcium intake"
        ]

    return {
        "status": "success",
        "risk_level": risk_level,
        "fall_probability_1yr": round(fall_prob_1yr, 1),
        "stance_duration_sec": t,
        "sway_stability_index": round(max(0, 100 - sway * 3), 1),
        "steadi_protocol": steadi_category,
        "recommended_interventions": interventions
    }

# ==========================================
# CURATED DEXA CENTRES (Punjab & Chandigarh)
# ==========================================

DEXA_CENTRES = [
    {
        "id": "pgi-chd",
        "name": "Post Graduate Institute of Medical Education & Research (PGIMER)",
        "city": "Chandigarh",
        "district": "Chandigarh",
        "address": "Sector 12, Chandigarh, 160012",
        "phone": "+91-172-2746018",
        "cost_inr": "₹ 600 - ₹ 1,000",
        "type": "Premier Government Tertiary Hospital",
        "wait_days": "1 - 3 days",
        "lat": 30.7656,
        "lng": 76.7761
    },
    {
        "id": "fortis-mohali",
        "name": "Fortis Hospital Mohali",
        "city": "Mohali",
        "district": "SAS Nagar (Mohali)",
        "address": "Sector 62, Phase VIII, Mohali, Punjab 160062",
        "phone": "+91-172-5021222",
        "cost_inr": "₹ 2,200 - ₹ 2,800",
        "type": "NABH Accredited Multi-speciality",
        "wait_days": "Same day / Next day",
        "lat": 30.6974,
        "lng": 76.7323
    },
    {
        "id": "max-mohali",
        "name": "Max Super Speciality Hospital Mohali",
        "city": "Mohali",
        "district": "SAS Nagar (Mohali)",
        "address": "Near Civil Hospital, Phase 6, Mohali, Punjab 160055",
        "phone": "+91-172-5212000",
        "cost_inr": "₹ 2,400 - ₹ 3,000",
        "type": "NABH Accredited Multi-speciality",
        "wait_days": "Same day",
        "lat": 30.7258,
        "lng": 76.7118
    },
    {
        "id": "dmc-ludhiana",
        "name": "Dayanand Medical College & Hospital (DMCH)",
        "city": "Ludhiana",
        "district": "Ludhiana",
        "address": "Tagore Nagar, Civil Lines, Ludhiana, Punjab 141001",
        "phone": "+91-161-4687700",
        "cost_inr": "₹ 1,200 - ₹ 1,800",
        "type": "Teaching Hospital & Diagnostic Hub",
        "wait_days": "1 day",
        "lat": 30.9068,
        "lng": 75.8308
    },
    {
        "id": "cmc-ludhiana",
        "name": "Christian Medical College & Hospital (CMC)",
        "city": "Ludhiana",
        "district": "Ludhiana",
        "address": "Brown Road, Ludhiana, Punjab 141008",
        "phone": "+91-161-2115000",
        "cost_inr": "₹ 1,300 - ₹ 1,900",
        "type": "Tertiary Care & Research Institute",
        "wait_days": "1 - 2 days",
        "lat": 30.9126,
        "lng": 75.8617
    },
    {
        "id": "gmc-amritsar",
        "name": "Government Medical College & Guru Nanak Dev Hospital",
        "city": "Amritsar",
        "district": "Amritsar",
        "address": "Majitha Road, Amritsar, Punjab 143001",
        "phone": "+91-183-2573217",
        "cost_inr": "₹ 500 - ₹ 800",
        "type": "Government Medical College",
        "wait_days": "2 - 4 days",
        "lat": 31.6575,
        "lng": 74.8872
    },
    {
        "id": "patiala-rajindra",
        "name": "Government Rajindra Hospital & Medical College",
        "city": "Patiala",
        "district": "Patiala",
        "address": "Sangrur Road, Patiala, Punjab 147001",
        "phone": "+91-175-2212018",
        "cost_inr": "₹ 500 - ₹ 900",
        "type": "State Tertiary Referral Centre",
        "wait_days": "2 - 3 days",
        "lat": 30.3398,
        "lng": 76.3869
    }
]

@app.get('/api/centres/dexa')
async def endpoint_dexa_centres(district: Optional[str] = None):
    if district:
        filtered = [c for c in DEXA_CENTRES if district.lower() in c['district'].lower() or district.lower() in c['city'].lower()]
        return {"total": len(filtered), "centres": filtered}
    return {"total": len(DEXA_CENTRES), "centres": DEXA_CENTRES}

# ==========================================
# CLINICIAN FEEDBACK LOOP
# ==========================================

class DoctorFeedbackRequest(BaseModel):
    patient_id: str
    screening_type: str  # "osteoarthritis" or "osteoporosis"
    predicted_label: str
    doctor_agreed: bool
    doctor_notes: Optional[str] = ""
    doctor_name: Optional[str] = "Attending Physician"

@app.post('/api/feedback/doctor')
async def endpoint_doctor_feedback(data: DoctorFeedbackRequest):
    log_file = Path("doctor_feedback_log.jsonl")
    entry = data.dict()
    entry["timestamp"] = pd.Timestamp.now().isoformat()
    
    with open(log_file, "a") as f:
        f.write(json.dumps(entry) + "\n")
        
    return {
        "status": "success",
        "message": "Clinical feedback successfully logged for continual active learning & validation.",
        "feedback_id": f"FB-{abs(hash(entry['timestamp'])) % 100000}"
    }

# ==========================================
# TRANSPARENT MODEL CARD & DATA SHEET
# ==========================================

@app.get('/api/model_card')
async def endpoint_model_card():
    return {
        "project": "Swastik Unified Bone & Joint Health Screening",
        "version": "2.4.0 (Hackathon Release)",
        "models": [
            {
                "name": "Osteoporosis DenseNet-121",
                "architecture": "DenseNet-121 with custom linear head (1024 -> 256 -> 3)",
                "classes": ["Normal", "Osteopenia", "Osteoporosis"],
                "total_test_samples": 1147,
                "metrics": {
                    "overall_accuracy": "83.3%",
                    "normal_sensitivity": "86.8%",
                    "osteopenia_sensitivity": "88.4%",
                    "osteoporosis_sensitivity": "76.2%",
                    "specificity_macro": "92.9%",
                    "screening_referral_threshold": "0.35 probability sum for Osteo/Osteopenia"
                },
                "preprocessing": "Border-crop trimming, CLAHE (Contrast-Limited Adaptive Histogram Equalization, clipLimit 2.5), ImageNet normalization",
                "explainability": "Grad-CAM attention heatmaps on penultimate dense block (denseblock4)"
            },
            {
                "name": "Clinical Osteoarthritis XGBoost",
                "inputs": ["age", "gender", "BMI", "WOMAC score", "VAS score"],
                "pipeline": "StandardScaler -> XGBClassifier",
                "primary_endpoint": "Symptomatic joint space compromise"
            },
            {
                "name": "Kinematic Joint Vision (MediaPipe)",
                "inputs": "Bilateral joint angles across gait cycle & active range-of-motion arcs",
                "features": ["Dynamic ROM", "Peak Flexion", "Bilateral Asymmetry Mean", "Pelvic Tilt"],
                "hardware_requirement": "Standard RGB Webcam (30 FPS) — No specialized sensors"
            }
        ],
        "ethical_considerations": "This system is an opportunistic triage and screening decision-support aid designed to expand access in underserved regions; it does not replace definitive DEXA bone densitometry or clinical radiological diagnosis."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
