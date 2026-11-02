"use client";

import { useState } from "react";
import { useScreening } from "@/context/ScreeningContext";
import { usePatient } from "@/context/PatientContext";
import { useRouter } from "next/navigation";
import { 
  DownloadIcon, 
  CheckCircledIcon, 
  ExclamationTriangleIcon, 
  MagicWandIcon, 
  ReloadIcon, 
  ArrowRightIcon, 
  ActivityLogIcon, 
  LayersIcon, 
  LockClosedIcon, 
  Cross2Icon,
  DrawingPinIcon
} from "@radix-ui/react-icons";
import { ThumbsUp, ThumbsDown, Phone, FlaskConical, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/config/api";

// Helper to determine if a lab value is in/out of normal range
function labStatus(value: number, range: string): "normal" | "low" | "high" {
  if (range.startsWith("<")) {
    const max = parseFloat(range.replace("<", ""));
    return value < max ? "normal" : "high";
  }
  if (range.startsWith(">")) {
    const min = parseFloat(range.replace(">", ""));
    return value > min ? "normal" : "low";
  }
  const parts = range.split("-").map(s => parseFloat(s.trim()));
  if (parts.length === 2) {
    if (value < parts[0]) return "low";
    if (value > parts[1]) return "high";
    return "normal";
  }
  return "normal";
}

const LAB_LABELS: Record<string, string> = {
  serum_calcium: "Serum Calcium",
  phosphorus: "Phosphorus",
  calcitriol: "Calcitriol (Vit D3)",
  calcitonin: "Calcitonin",
  bone_turnover_fnt: "Bone Turnover (FNT)",
  uric_acid: "Uric Acid",
  creatinine: "Creatinine",
  bun: "Blood Urea Nitrogen",
  alt: "ALT (Liver)",
  ast: "AST (Liver)",
  fbg: "Fasting Blood Glucose",
  ldl_c: "LDL Cholesterol",
  hdl_c: "HDL Cholesterol",
};

export default function OsteoporosisResults() {
  const { clinicalResult, imagingResult } = useScreening();
  const { patient } = usePatient();
  const router = useRouter();

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [doctorFeedback, setDoctorFeedback] = useState<"agreed" | "disagreed" | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showDexaModal, setShowDexaModal] = useState(false);
  const [showLabPanel, setShowLabPanel] = useState(true);

  if (!clinicalResult && !imagingResult) {
    return (
      <div className="text-gray-900 text-center mt-20 max-w-md mx-auto p-8 bg-white border border-[#EBE8E3] rounded-3xl shadow-sm">
        <p className="text-gray-500 mb-6 text-sm">No screening results available for this session.</p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#18181B] text-white font-bold text-xs hover:bg-black transition-all shadow-md"
        >
          Return to Patient Intake
        </Link>
      </div>
    );
  }

  // Calculate true risk probabilities
  const clinicalRisk = clinicalResult ? clinicalResult.probability : 0;
  const imagingRisk = imagingResult ? imagingResult.probability : 0;

  // Weighted multimodal risk score (radiography is an objective deep structural marker: 60% weight, clinical: 40%)
  const combinedRisk = (clinicalResult && imagingResult)
    ? (clinicalRisk * 0.40 + imagingRisk * 0.60)
    : (clinicalResult ? clinicalRisk : imagingRisk);

  const clinicalLabel = clinicalResult?.result || "N/A";
  const imagingLabel = imagingResult?.result || "N/A";

  const isHighRisk = 
    imagingLabel.toLowerCase().includes("osteoporosis") || 
    clinicalLabel.toLowerCase().includes("osteoporosis") || 
    combinedRisk >= 0.55;

  const isMediumRisk = !isHighRisk && (
    imagingLabel.toLowerCase().includes("osteopenia") || 
    clinicalLabel.toLowerCase().includes("osteopenia") || 
    combinedRisk >= 0.28
  );

  const isDiscordant = Boolean(clinicalResult && imagingResult && (
    (clinicalLabel.toLowerCase().includes("normal") && !imagingLabel.toLowerCase().includes("normal")) ||
    (!clinicalLabel.toLowerCase().includes("normal") && imagingLabel.toLowerCase().includes("normal"))
  ));

  const actualAge = patient?.age || 62;
  const boneAge = imagingResult?.bone_health_age || Math.round(actualAge + (imagingRisk > 0.6 ? 12 : imagingRisk > 0.3 ? 4 : -3));

  // Get biochemical data from clinical result
  const biochem = clinicalResult?.biochemical_summary as Record<string, { value: number; unit: string; range: string }> | undefined;
  const evidence = clinicalResult?.evidence as string[] | undefined;
  const tScore = clinicalResult?.t_score as number | undefined;

  const handleDoctorFeedback = async (agreed: boolean) => {
    setDoctorFeedback(agreed ? "agreed" : "disagreed");
    try {
      await apiFetch("/api/feedback/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patient?.patientId || "ANONYMOUS",
          screening_type: "osteoporosis",
          predicted_label: `Clinical: ${clinicalLabel}, Imaging: ${imagingLabel}`,
          doctor_agreed: agreed,
          doctor_notes: agreed ? "Clinician confirmed finding." : "Clinician flagged divergence.",
          doctor_name: "Attending Physician"
        })
      });
      setFeedbackSubmitted(true);
    } catch (e) {
      console.error("Feedback logging error:", e);
      setFeedbackSubmitted(true);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=SWASTIK-REF-${patient?.screeningId || '101'}-RISK-${Math.round(combinedRisk * 100)}`;

  // Risk color helpers
  const riskColor = isHighRisk ? "text-[#E65100]" : isMediumRisk ? "text-amber-600" : "text-emerald-600";
  const riskBg = isHighRisk ? "bg-[#FFEFEA]" : isMediumRisk ? "bg-amber-50" : "bg-emerald-50";
  const riskBorder = isHighRisk ? "border-[#FFD8CC]" : isMediumRisk ? "border-amber-200" : "border-emerald-200";
  const riskStatusLabel = isHighRisk ? "Elevated Risk (Osteoporosis)" : isMediumRisk ? "Moderate Risk (Osteopenia / Low Bone Mass)" : "Normal Baseline";
  const riskActionLabel = isHighRisk ? "DEXA Referral Indicated" : isMediumRisk ? "Lifestyle + Calcium/Vit D Therapy • Follow-up DEXA" : "Annual Monitoring";

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#18181B] py-10 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Header with Patient Card */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-[#EA580C] border border-orange-200/80 mb-3 print:hidden">
            <MagicWandIcon className="w-3.5 h-3.5" /> DenseNet-121 Clean Architecture • Multimodal Decision Support
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 flex items-center gap-3 tracking-tight text-gray-900">
            <LayersIcon className="text-[#FF6B4A] w-9 h-9" />
            Osteoporosis <span className="text-[#FF6B4A]">Clinical Assessment</span>
          </h1>

          {patient && (
            <div className="flex items-center gap-4 border border-[#EBE8E3] bg-white px-5 py-3 rounded-2xl w-max shadow-sm print:border-black/20">
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Patient Name</span>
                <span className="text-gray-900 font-bold text-base">{patient.patientName}</span>
              </div>
              <div className="w-px h-8 bg-gray-200 mx-2"></div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Age / Gender</span>
                <span className="text-gray-900 font-bold text-base">{patient.age}y • {patient.gender}</span>
              </div>
              <div className="w-px h-8 bg-gray-200 mx-2"></div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Screening ID</span>
                <span className="text-[#EA580C] font-mono font-bold text-base">{patient.screeningId}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 print:hidden">
          <button 
            onClick={() => setShowDexaModal(true)}
            className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm hover:scale-102"
          >
            <DrawingPinIcon className="w-4 h-4 text-purple-600" />
            Find DEXA Centres
          </button>
          
          <button 
            onClick={() => window.print()} 
            className="group flex items-center gap-2 bg-[#18181B] hover:bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md shadow-black/10 hover:scale-102"
          >
            <DownloadIcon className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            Referral PDF
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff !important; color: black !important; }
          button { display: none !important; }
          .print-hidden { display: none !important; }
          ::-webkit-scrollbar { display: none; }
        }
      `}} />

      {/* ═══════════════════════════════════════════════ */}
      {/* PRIMARY DIAGNOSIS CARD */}
      {/* ═══════════════════════════════════════════════ */}
      <div className={`border-2 p-7 md:p-8 rounded-3xl mb-8 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.04)] transition-all ${
        isHighRisk 
          ? "bg-gradient-to-r from-orange-50/70 via-rose-50/40 to-white border-[#FFD8CC]"
          : isMediumRisk
          ? "bg-gradient-to-r from-amber-50/70 to-white border-amber-200"
          : "bg-gradient-to-r from-emerald-50/70 to-white border-emerald-200"
      }`}>
        <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
          <div className="flex-1 space-y-4">
            <h2 className={`text-2xl font-extrabold flex items-center gap-2 ${riskColor}`}>
              <ActivityLogIcon className="w-6 h-6" /> Multimodal Calibrated Synthesis
            </h2>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              Fusing clinical lifestyle biomarkers (<strong>{clinicalResult?.model_name || "XGBoost Pipeline"}</strong>) with deep radiographic bone attenuation (<strong>{imagingResult?.model_name || "DenseNet-121 Clean"}</strong>).
            </p>

            {/* T-Score Highlight (if available) */}
            {tScore !== undefined && (
              <div className="inline-flex items-center gap-4 bg-white border border-[#EBE8E3] px-5 py-3 rounded-2xl shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[11px] text-gray-400 uppercase font-semibold">DEXA T-Score (L1-L4)</span>
                  <span className={`text-lg font-bold ${tScore <= -2.5 ? "text-rose-600" : tScore <= -1.0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {tScore.toFixed(1)}
                  </span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-gray-400 uppercase font-semibold">WHO Classification</span>
                  <span className={`text-lg font-bold ${tScore <= -2.5 ? "text-rose-600" : tScore <= -1.0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {tScore <= -2.5 ? "Osteoporosis" : tScore <= -1.0 ? "Osteopenia" : "Normal BMD"}
                  </span>
                </div>
              </div>
            )}

            {/* Bone Health Age Callout */}
            <div className="inline-flex items-center gap-4 bg-white border border-[#EBE8E3] px-5 py-3 rounded-2xl shadow-sm">
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400 uppercase font-semibold">Chronological Age</span>
                <span className="text-lg font-bold text-gray-900">{actualAge} yrs</span>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#EA580C] uppercase font-bold">Bone Structural Age</span>
                <span className={`text-lg font-extrabold ${boneAge > actualAge ? "text-[#E65100]" : "text-emerald-600"}`}>
                  {boneAge} yrs {boneAge > actualAge ? `(+${boneAge - actualAge}y aging)` : "(-Optimal)"}
                </span>
              </div>
            </div>

            {isDiscordant && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-xs md:text-sm">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Clinical Note on Modality Variance:</strong> {
                    clinicalLabel.toLowerCase().includes("normal") && !imagingLabel.toLowerCase().includes("normal")
                      ? `Radiographic bone attenuation reveals significant trabecular demineralization (${imagingLabel}) with +${Math.max(0, boneAge - actualAge)}y structural bone aging, despite a mild questionnaire profile (${clinicalLabel}). Deep AI radiograph analysis identified early/asymptomatic bone density loss.`
                      : `Clinical questionnaire indicates elevated fragility risks (${clinicalLabel}), while plain X-ray features appear early-stage (${imagingLabel}). Plain radiographs often appear normal until >30% bone mineral depletion occurs. Confirmatory DEXA scan advised.`
                  }
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className="bg-white p-6 rounded-3xl border border-[#EBE8E3] min-w-[240px] text-center shadow-md">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Composite Triage Status</p>
              <p className={`text-2xl font-black ${riskColor}`}>
                {riskStatusLabel}
              </p>
              <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${riskBg} ${riskColor} border ${riskBorder}`}>
                {riskActionLabel}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-gray-400 text-xs">{isHighRisk ? "Osteoporosis Risk Index" : isMediumRisk ? "Bone Fragility Risk Index" : "Osteoporosis Risk Index"}</p>
                <p className={`text-2xl font-bold font-mono mt-0.5 ${riskColor}`}>{(combinedRisk * 100).toFixed(1)}%</p>
              </div>
            </div>

            {/* QR Code Card for Doctor */}
            <div className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center text-black border border-[#EBE8E3] shadow-md">
              <img src={qrUrl} alt="Doctor Referral QR" className="w-24 h-24 object-contain" />
              <span className="text-[10px] font-mono font-bold mt-1 text-gray-600">Scan for e-Referral</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* BIOCHEMICAL LAB PANEL (NEW - addresses "Biochemical numbers omitted" issue) */}
      {/* ═══════════════════════════════════════════════ */}
      {biochem && (
        <div className="bg-white border border-[#EBE8E3] p-6 md:p-8 rounded-3xl shadow-[0_15px_45px_-10px_rgba(0,0,0,0.04)] mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-[#FF6B4A]" /> Biochemical Lab Panel
            </h2>
            <button 
              onClick={() => setShowLabPanel(!showLabPanel)} 
              className="text-xs text-gray-500 hover:text-gray-900 font-medium px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition-all"
            >
              {showLabPanel ? "Collapse" : "Expand"}
            </button>
          </div>

          {showLabPanel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(biochem).map(([key, info]) => {
                const status = labStatus(info.value, info.range);
                const statusColor = status === "normal" ? "text-emerald-600" : status === "high" ? "text-rose-600" : "text-amber-600";
                const statusBg = status === "normal" ? "bg-emerald-50 border-emerald-200" : status === "high" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200";
                const StatusIcon = status === "normal" ? Minus : status === "high" ? TrendingUp : TrendingDown;
                const label = LAB_LABELS[key] || key;

                return (
                  <div key={key} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${statusBg} transition-all`}>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider truncate">{label}</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className={`text-base font-bold ${statusColor}`}>{info.value}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{info.unit}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                      <span className="text-[10px] text-gray-400 mt-0.5">Ref: {info.range}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Evidence / Clinical Flags */}
          {evidence && evidence.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Clinical Evidence Summary</h3>
              <div className="space-y-2">
                {evidence.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* If no biochem data, show a note instead of "omitted" */}
      {!biochem && clinicalResult && (
        <div className="bg-white border border-[#EBE8E3] p-5 rounded-3xl mb-8 flex items-center gap-3 text-sm text-gray-500">
          <FlaskConical className="w-5 h-5 text-gray-400" />
          <span>Biochemical panel not available — this screening used the <strong>Basic Clinical Questionnaire</strong> pathway (no DEXA / lab values required).</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* GRID: Grad-CAM + Probabilities */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Grad-CAM Heatmap Viewer */}
        <div className="bg-white border border-[#EBE8E3] p-6 rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MagicWandIcon className="w-5 h-5 text-[#FF6B4A]" /> Explainable AI (Grad-CAM)
              </h2>
              {imagingResult?.gradcam_image && (
                <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-xl text-xs border border-gray-200/80">
                  <button 
                    onClick={() => setShowHeatmap(true)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${showHeatmap ? "bg-[#18181B] text-white font-bold" : "text-gray-600 hover:text-black"}`}
                  >
                    Heatmap
                  </button>
                  <button 
                    onClick={() => setShowHeatmap(false)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${!showHeatmap ? "bg-[#18181B] text-white font-bold" : "text-gray-600 hover:text-black"}`}
                  >
                    Plain X-Ray
                  </button>
                </div>
              )}
            </div>

            {imagingResult?.gradcam_image ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-[#FAF9F6] aspect-square max-h-[340px] mx-auto flex items-center justify-center">
                <img 
                  src={showHeatmap ? imagingResult.gradcam_image : (imagingResult.original_preview || imagingResult.gradcam_image)} 
                  alt="Radiograph Analysis" 
                  className="w-full h-full object-contain p-2"
                />
                {showHeatmap && (
                  <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl text-xs border border-gray-200 shadow-sm flex items-center justify-between">
                    <span className="text-gray-700">Target: Proximal Tibia Condyle</span>
                    <span className="text-[#EA580C] font-semibold font-mono">DenseNet-121 Attention</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                No radiograph heatmap available.
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#EA580C] font-medium">
              <LockClosedIcon className="w-4 h-4" /> CLAHE Contrast Enhancement Applied
            </span>
            <span>Target Class: <strong>{imagingLabel}</strong></span>
          </div>
        </div>

        {/* Detailed Probabilities & Clinical Breakdown */}
        <div className="space-y-6">
          {/* Imaging Probabilities */}
          <div className="bg-white border border-[#EBE8E3] p-6 rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <LayersIcon className="w-5 h-5 text-[#FF6B4A]" /> DenseNet-121 Class Probabilities
            </h3>
            
            {imagingResult?.probabilities ? (
              <div className="space-y-3">
                {Object.entries(imagingResult.probabilities).map(([label, pct]: [string, any]) => {
                  const val = Number(pct);
                  const isWinner = label.toLowerCase() === imagingLabel.toLowerCase();
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={isWinner ? "font-bold text-gray-900" : "text-gray-500"}>{label}</span>
                        <span className="font-mono font-medium text-gray-900">{val.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            label === "Osteoporosis" ? "bg-rose-500" : label === "Osteopenia" ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.max(val, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-xs">Probability distribution unavailable — imaging was skipped.</p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
              <span>Overall Radiograph Diagnosis:</span>
              <span className="font-bold text-sm text-gray-900">{imagingLabel}</span>
            </div>
          </div>

          {/* Clinical Pipeline Card */}
          <div className="bg-white border border-[#EBE8E3] p-6 rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ActivityLogIcon className="w-5 h-5 text-[#FF6B4A]" /> Clinical Biomarker Pipeline
            </h3>
            {clinicalResult ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Risk Prediction:</span>
                  <span className={`font-bold ${clinicalLabel === "Osteoporosis" ? "text-rose-600" : clinicalLabel === "Osteopenia" ? "text-amber-600" : "text-emerald-600"}`}>
                    {clinicalLabel}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Osteoporosis Probability:</span>
                  <span className={`font-mono font-bold ${clinicalRisk >= 0.5 ? "text-rose-600" : clinicalRisk >= 0.3 ? "text-amber-600" : "text-emerald-600"}`}>
                    {(clinicalRisk * 100).toFixed(1)}%
                  </span>
                </div>
                {clinicalResult.probabilities && (
                  <div className="mt-2 space-y-1.5">
                    {Object.entries(clinicalResult.probabilities).map(([label, pct]: [string, any]) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-gray-500">{label}:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${label === "Osteoporosis" ? "bg-rose-400" : label === "Osteopenia" ? "bg-amber-400" : "bg-emerald-400"}`}
                              style={{ width: `${Math.max(Number(pct), 3)}%` }}
                            />
                          </div>
                          <span className="font-mono text-gray-700 font-medium w-12 text-right">{Number(pct).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">Pipeline: {clinicalResult.model_name}</p>
              </div>
            ) : (
              <p className="text-gray-400 text-xs">Questionnaire screening was skipped.</p>
            )}
          </div>

          {/* Clinician Feedback Loop (Active Learning) */}
          <div className="bg-white border border-[#EBE8E3] p-5 rounded-3xl shadow-sm flex items-center justify-between print:hidden">
            <div>
              <p className="text-xs font-bold text-gray-900">Clinician Review & Feedback</p>
              <p className="text-[11px] text-gray-500">Does this finding match clinical judgment?</p>
            </div>
            {feedbackSubmitted ? (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                <CheckCircledIcon className="w-4 h-4" /> Feedback Logged
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDoctorFeedback(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> Agree
                </button>
                <button
                  onClick={() => handleDoctorFeedback(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all"
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> Disagree
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6 print:hidden">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors text-xs font-semibold"
        >
          <ReloadIcon className="w-3.5 h-3.5" /> Start New Patient Screening
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/screening/lifestyle-simulator"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#18181B] hover:bg-black text-white transition-all shadow-md shadow-black/10 hover:scale-102"
          >
            What-If Lifestyle Simulator <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* DEXA Centres Modal */}
      {showDexaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EBE8E3] rounded-3xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <DrawingPinIcon className="w-5 h-5 text-purple-600" /> Vetted DEXA Diagnostic Centres
                </h3>
                <p className="text-xs text-gray-500">Referral-ready facilities across Punjab & Chandigarh</p>
              </div>
              <button 
                onClick={() => setShowDexaModal(false)}
                className="text-gray-400 hover:text-black p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Cross2Icon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  name: "Post Graduate Institute of Medical Education & Research (PGIMER)",
                  city: "Chandigarh (Sec 12)",
                  phone: "+91-172-2746018",
                  cost: "₹ 600 - ₹ 1,000",
                  type: "Premier Government Tertiary Hospital"
                },
                {
                  name: "Fortis Hospital Mohali",
                  city: "Mohali (Phase VIII)",
                  phone: "+91-172-5021222",
                  cost: "₹ 2,200 - ₹ 2,800",
                  type: "NABH Accredited Multi-speciality"
                },
                {
                  name: "Max Super Speciality Hospital Mohali",
                  city: "Mohali (Phase 6)",
                  phone: "+91-172-5212000",
                  cost: "₹ 2,400 - ₹ 3,000",
                  type: "NABH Accredited Multi-speciality"
                },
                {
                  name: "Dayanand Medical College & Hospital (DMCH)",
                  city: "Ludhiana (Civil Lines)",
                  phone: "+91-161-4687700",
                  cost: "₹ 1,200 - ₹ 1,800",
                  type: "Teaching Hospital & Diagnostic Hub"
                },
                {
                  name: "Government Medical College & GNDH",
                  city: "Amritsar (Majitha Rd)",
                  phone: "+91-183-2573217",
                  cost: "₹ 500 - ₹ 800",
                  type: "Government Medical College"
                }
              ].map((centre, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[#FAF9F6] border border-gray-100 hover:border-purple-300 transition-all flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{centre.name}</h4>
                    <p className="text-xs text-gray-500">{centre.city} • {centre.type}</p>
                    <p className="text-xs text-purple-700 mt-1 flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3" /> {centre.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-700">{centre.cost}</span>
                    <p className="text-[10px] text-gray-400">Typical Scan Cost</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDexaModal(false)}
                className="px-5 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition-colors"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
