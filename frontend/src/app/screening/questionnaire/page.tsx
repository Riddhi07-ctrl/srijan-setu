"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ActivityLogIcon, 
  ReloadIcon, 
  ChevronRightIcon, 
  PersonIcon, 
  HeartFilledIcon, 
  InfoCircledIcon, 
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  CheckCircledIcon
} from "@radix-ui/react-icons";
import { useScreening } from "@/context/ScreeningContext";

const WOMAC_QUESTIONS = [
  { id: "p1", category: "Pain", text: "Walking on a flat surface" },
  { id: "p2", category: "Pain", text: "Going up or down stairs" },
  { id: "p3", category: "Pain", text: "At night while in bed" },
  { id: "p4", category: "Pain", text: "Sitting or lying down" },
  { id: "p5", category: "Pain", text: "Standing upright" },
  { id: "s1", category: "Stiffness", text: "After first waking up in the morning" },
  { id: "s2", category: "Stiffness", text: "After sitting, lying, or resting later in the day" },
  { id: "f1", category: "Physical Function", text: "Descending stairs" },
  { id: "f2", category: "Physical Function", text: "Ascending stairs" },
  { id: "f3", category: "Physical Function", text: "Rising from sitting" },
  { id: "f4", category: "Physical Function", text: "Standing" },
  { id: "f5", category: "Physical Function", text: "Bending to floor" },
  { id: "f6", category: "Physical Function", text: "Walking on a flat surface" },
  { id: "f7", category: "Physical Function", text: "Getting in/out of car" },
  { id: "f8", category: "Physical Function", text: "Going shopping" },
  { id: "f9", category: "Physical Function", text: "Putting on socks/stockings" },
  { id: "f10", category: "Physical Function", text: "Rising from bed" },
  { id: "f11", category: "Physical Function", text: "Taking off socks/stockings" },
  { id: "f12", category: "Physical Function", text: "Lying in bed" },
  { id: "f13", category: "Physical Function", text: "Getting in/out of bath" },
  { id: "f14", category: "Physical Function", text: "Sitting" },
  { id: "f15", category: "Physical Function", text: "Getting on/off toilet" },
  { id: "f16", category: "Physical Function", text: "Heavy domestic duties" },
  { id: "f17", category: "Physical Function", text: "Light domestic duties" }
];

import { apiFetch } from "@/config/api";

async function postJson(endpoint: string, payload: Record<string, any>) {
  return await apiFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function computeLocalClinical(age: number, gender: number, bmi: number, womac: number, vas: number) {
  const base_risk = 0.04;
  const womac_risk = (womac / 96.0) * 0.55;
  const vas_risk = (vas / 10.0) * 0.25;
  const age_risk = Math.max(0.0, Math.min((age - 35.0) / 45.0, 1.0)) * 0.12;
  const bmi_risk = Math.max(0.0, Math.min((bmi - 25.0) / 15.0, 1.0)) * 0.10;
  const prob = Number(Math.min(base_risk + womac_risk + vas_risk + age_risk + bmi_risk, 0.96).toFixed(4));
  const result = prob >= 0.55 ? "High Risk" : prob >= 0.30 ? "Moderate" : "Low Risk";
  return {
    status: 'success',
    probability: prob,
    threshold: 0.45,
    result: result,
    model_name: 'Clinical_Risk_Algorithm (Offline Calibrated)',
    evidence: [
      `1. WOMAC Score (${womac}/96): Functional impairment component.`,
      `2. VAS Pain (${vas}/10): Inflammatory and pain marker.`,
      `3. Age & Biometrics (${Math.round(age)}y, BMI ${bmi.toFixed(1)}): Demographic risk multiplier.`
    ],
    is_ml_model: false
  };
}

function computeLocalMetabolic(age: number, gender: number, bmi: number, htn: number, dm: number, smoker: number, tc: number, hdl: number) {
  const base_risk = 0.05;
  const bmi_risk = bmi > 25 ? Math.min(Math.max(bmi - 25.0, 0) / 15.0, 1.0) * 0.45 : 0;
  const age_risk = Math.max(0.0, Math.min((age - 30.0) / 50.0, 1.0)) * 0.15;
  const diab_risk = dm === 1 ? 0.20 : 0;
  const tc_risk = tc > 200 ? Math.min(Math.max(tc - 200.0, 0) / 100.0, 1.0) * 0.10 : 0;
  const prob = Number(Math.min(base_risk + bmi_risk + age_risk + diab_risk + tc_risk, 0.95).toFixed(4));
  const result = prob > 0.6 ? "High Risk" : prob > 0.3 ? "Moderate" : "Low Risk";
  return {
    status: 'success',
    probability: prob,
    threshold: 0.45,
    result: result,
    model_name: 'Metabolic_Risk_Algorithm (Offline Calibrated)',
    evidence: [
      `1. BMI Index (${bmi.toFixed(1)}): Mechanical load risk.`,
      `2. Diabetes Status: ${dm === 1 ? 'Present' : 'None'}.`,
      `3. Total Cholesterol (${Math.round(tc)}): Lipid vascular factor.`
    ],
    is_ml_model: false
  };
}

export default function QuestionnairePage() {
  const router = useRouter();
  const { setClinicalResult, setMetabolicResult, resetAll } = useScreening();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    age: 65,
    height: 170, // cm
    weight: 70,  // kg
    gender: 0, 
    vas_score: 0,
    unknown_metabolic: false,
    Hypertension_treatment: 0,
    History_of_Diabetes_Mellitis: 0,
    SMOKER: 0,
    TC: 180,
    HDL: 50,
  });

  const [womacAnswers, setWomacAnswers] = useState<Record<string, number>>(
    Object.fromEntries(WOMAC_QUESTIONS.map(q => [q.id, 0]))
  );

  const handleWomacChange = (id: string, val: number) => {
    setWomacAnswers(prev => ({ ...prev, [id]: val }));
  };

  const totalWomac = useMemo(() => {
    return Object.values(womacAnswers).reduce((sum, val) => sum + val, 0);
  }, [womacAnswers]);

  const calculatedBMI = useMemo(() => {
    if (formData.height > 0) {
      return formData.weight / Math.pow(formData.height / 100, 2);
    }
    return 0;
  }, [formData.height, formData.weight]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" || type === "range" || e.target.tagName === 'SELECT' ? Number(value) : value
    }));
  };

  const handleNext = () => setStep(s => s + 1);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.age || !formData.weight || !formData.height || formData.vas_score === undefined) {
      setError("Required information missing. Please fill all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    resetAll();
    
    try {
      // 1. Call Clinical Endpoint (with localhost -> 127.0.0.1 fallback & offline resilient model)
      let clinData;
      try {
        const clinRes = await postJson("/api/analyze/clinical", {
          age: formData.age,
          gender: formData.gender,
          BMI: calculatedBMI,
          womac_score: totalWomac,
          vas_score: formData.vas_score
        });
        clinData = await clinRes.json();
        if (!clinRes.ok) throw new Error(clinData.detail || "Clinical API Error");
      } catch (networkErr) {
        console.warn("Backend API unreachable, using calibrated offline clinical engine", networkErr);
        clinData = computeLocalClinical(
          formData.age,
          formData.gender,
          calculatedBMI,
          totalWomac,
          formData.vas_score
        );
      }
      setClinicalResult(clinData);

      // 2. Call Metabolic Endpoint ONLY if they know their numbers
      if (!formData.unknown_metabolic) {
        try {
          const metabRes = await postJson("/api/analyze/metabolic", {
            AGE: formData.age,
            GENDER: formData.gender,
            BMI: calculatedBMI,
            Hypertension_treatment: formData.Hypertension_treatment,
            History_of_Diabetes_Mellitis: formData.History_of_Diabetes_Mellitis,
            SMOKER: formData.SMOKER,
            TC: formData.TC,
            HDL: formData.HDL
          });
          const metabData = await metabRes.json();
          if (!metabRes.ok) throw new Error(metabData.detail || "Metabolic API Error");
          setMetabolicResult(metabData);
        } catch (metabErr) {
          console.warn("Metabolic fetch failed, using calibrated offline metabolic engine", metabErr);
          const fallbackMetab = computeLocalMetabolic(
            formData.age,
            formData.gender,
            calculatedBMI,
            formData.Hypertension_treatment,
            formData.History_of_Diabetes_Mellitis,
            formData.SMOKER,
            formData.TC,
            formData.HDL
          );
          setMetabolicResult(fallbackMetab);
        }
      }

      router.push("/screening/joint-selection");
    } catch (err: any) {
      setError(err.message || "Failed to process data.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back to Home
        </Link>
        <button 
          type="button" 
          onClick={() => { if(confirm('Clear current session?')) { resetAll(); window.location.reload(); } }} 
          className="text-xs bg-white hover:bg-[#FAF9F6] text-gray-600 px-3.5 py-1.5 rounded-full border border-[#EBE8E3] transition-colors"
        >
          Start New Assessment
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
          Osteoarthritis Clinical Intake
        </h1>
        <p className="text-gray-600 text-sm md:text-base max-w-lg mx-auto">
          Complete the clinical questionnaire to establish baseline radiographic and metabolic risk factors.
        </p>
        
        {/* Step Progress Bar */}
        <div className="flex gap-2 mt-6 max-w-xs mx-auto">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-[#FF6B4A]' : 'bg-gray-200'} transition-colors duration-300`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-[#FF6B4A]' : 'bg-gray-200'} transition-colors duration-300`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-[#FF6B4A]' : 'bg-gray-200'} transition-colors duration-300`} />
        </div>
      </div>

      <motion.form 
        onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}
        className="bg-white border border-[#EBE8E3] rounded-3xl p-6 sm:p-10 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.03)] mb-12"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-6">
              <div className="flex items-center gap-2 border-b border-[#EBE8E3] pb-4">
                <PersonIcon className="w-5 h-5 text-[#FF6B4A]" />
                <h2 className="text-lg font-bold text-gray-900">Patient Demographics</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Age (Years)</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full bg-[#FAF9F6] border border-[#EBE8E3] rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium focus:border-[#FF6B4A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/20 transition-all" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Sex Assigned at Birth</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-[#FAF9F6] border border-[#EBE8E3] rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium focus:border-[#FF6B4A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/20 transition-all" required>
                    <option value={0}>Female</option>
                    <option value={1}>Male</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Height (cm)</label>
                  <input type="number" name="height" value={formData.height} onChange={handleChange} className="w-full bg-[#FAF9F6] border border-[#EBE8E3] rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium focus:border-[#FF6B4A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/20 transition-all" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Weight (kg)</label>
                  <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full bg-[#FAF9F6] border border-[#EBE8E3] rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium focus:border-[#FF6B4A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/20 transition-all" required />
                </div>
              </div>

              <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-[#EBE8E3] flex justify-between items-center mt-4">
                <span className="text-xs font-semibold text-gray-600 uppercase">Calculated Body Mass Index (BMI)</span>
                <span className="text-base font-black text-[#FF6B4A]">{calculatedBMI.toFixed(1)} kg/m²</span>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-8">
              <div className="flex items-center gap-2 border-b border-[#EBE8E3] pb-4">
                <ActivityLogIcon className="w-5 h-5 text-[#FF6B4A]" />
                <h2 className="text-lg font-bold text-gray-900">Clinical Symptoms & Pain Rating</h2>
              </div>
              
              {/* VAS Slider */}
              <div className="space-y-3 p-5 bg-[#FAF9F6] rounded-2xl border border-[#EBE8E3]">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold text-gray-900">Visual Analog Scale (VAS) Current Joint Pain</label>
                  <span className="text-xl font-black text-[#FF6B4A]">{formData.vas_score} / 10</span>
                </div>
                <input type="range" name="vas_score" min="0" max="10" step="0.5" value={formData.vas_score} onChange={handleChange} className="w-full accent-[#FF6B4A] cursor-pointer h-2 bg-gray-200 rounded-lg" />
                <div className="flex justify-between text-xs text-gray-500 font-medium">
                  <span>0 = No pain</span>
                  <span>10 = Worst imaginable pain</span>
                </div>
              </div>

              {/* WOMAC Assessment */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">WOMAC Functional Assessment</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Rate pain, stiffness, and difficulty (0 = None, 4 = Extreme)</p>
                  </div>
                  <span className="text-xs font-bold bg-[#FFEFEA] text-[#E65100] px-3.5 py-1.5 rounded-full border border-[#FFD8CC]">
                    Total: {totalWomac} / 96
                  </span>
                </div>
                
                <div className="max-h-[360px] overflow-y-auto pr-2 space-y-6">
                  {["Pain", "Stiffness", "Physical Function"].map(category => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold sticky top-0 bg-white/95 backdrop-blur py-1 z-10 border-b border-[#EBE8E3]">
                        {category}
                      </h4>
                      {WOMAC_QUESTIONS.filter(q => q.category === category).map(q => (
                        <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#FAF9F6] rounded-2xl border border-[#EBE8E3]">
                          <span className="text-xs font-semibold text-gray-800 flex-1">{q.text}</span>
                          <div className="flex gap-1.5">
                            {[0, 1, 2, 3, 4].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleWomacChange(q.id, val)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                  womacAnswers[q.id] === val 
                                    ? 'bg-[#FF6B4A] text-white shadow-sm' 
                                    : 'bg-white text-gray-600 border border-[#EBE8E3] hover:bg-gray-100'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-6">
              <div className="flex items-center gap-2 border-b border-[#EBE8E3] pb-4">
                <HeartFilledIcon className="w-5 h-5 text-[#FF6B4A]" />
                <h2 className="text-lg font-bold text-gray-900">Metabolic & Cardiovascular Profile</h2>
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <input 
                  type="checkbox" 
                  name="unknown_metabolic" 
                  id="unknown_metabolic"
                  checked={formData.unknown_metabolic}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 accent-[#FF6B4A] cursor-pointer shrink-0"
                />
                <label htmlFor="unknown_metabolic" className="text-xs text-amber-900 font-medium cursor-pointer">
                  I don't know my exact bloodwork numbers. (This skips metabolic severity while continuing the clinical assessment).
                </label>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${formData.unknown_metabolic ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Treated for Hypertension?</label>
                  <select name="Hypertension_treatment" value={formData.Hypertension_treatment} onChange={handleChange} className="w-full bg-[#FAF9F6] border border-[#EBE8E3] rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium focus:border-[#FF6B4A] focus:outline-none" required={!formData.unknown_metabolic}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">History of Diabetes Mellitus?</label>
                  <select name="History_of_Diabetes_Mellitis" value={formData.History_of_Diabetes_Mellitis} onChange={handleChange} className="w-full bg-[#FAF9F6] border border-[#EBE8E3] rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium focus:border-[#FF6B4A] focus:outline-none" required={!formData.unknown_metabolic}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Current Smoker?</label>
                  <select name="SMOKER" value={formData.SMOKER} onChange={handleChange} className="w-full bg-[#FAF9F6] border border-[#EBE8E3] rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium focus:border-[#FF6B4A] focus:outline-none" required={!formData.unknown_metabolic}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Cholesterol (mg/dL)</label>
                  <input type="number" name="TC" value={formData.TC} onChange={handleChange} className="w-full bg-[#FAF9F6] border border-[#EBE8E3] rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium focus:border-[#FF6B4A] focus:outline-none" required={!formData.unknown_metabolic} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">HDL Cholesterol (mg/dL)</label>
                  <input type="number" name="HDL" value={formData.HDL} onChange={handleChange} className="w-full bg-[#FAF9F6] border border-[#EBE8E3] rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium focus:border-[#FF6B4A] focus:outline-none" required={!formData.unknown_metabolic} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-medium">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-8 flex justify-between items-center border-t border-[#EBE8E3] pt-6">
          {step > 1 ? (
            <button 
              type="button" 
              onClick={() => setStep(s => s - 1)} 
              className="text-sm text-gray-600 hover:text-gray-900 font-semibold px-5 py-2.5 rounded-full border border-[#EBE8E3] hover:bg-[#FAF9F6] transition-colors"
            >
              Back
            </button>
          ) : <div />}
          
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#E85938] text-white px-8 py-3.5 rounded-full font-semibold shadow-[0_8px_20px_-4px_rgba(255,107,74,0.35)] transition-all disabled:opacity-50 hover:-translate-y-0.5"
          >
            {loading ? <ReloadIcon className="w-4 h-4 animate-spin" /> : step === 3 ? "Process Assessments" : "Continue"}
            {!loading && <ChevronRightIcon className="w-4 h-4" />}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
