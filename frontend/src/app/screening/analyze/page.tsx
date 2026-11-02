"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  CheckCircledIcon, 
  ReloadIcon, 
  ActivityLogIcon,
  ExclamationTriangleIcon 
} from "@radix-ui/react-icons";
import { useScreening } from "@/context/ScreeningContext";
import { apiFetch } from "@/config/api";

const STAGES = [
  "Kinematic Landmark Extraction",
  "Pose Frame Alignment & Quality Check",
  "Spatial Joint Trajectory Calculation",
  "Frontal/Sagittal Excursion Estimation",
  "Multi-Stream AI Inference",
  "Screening Classification Ready"
];

export default function AnalyzePage() {
  const router = useRouter();
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const { tempCameraAngles, setCameraResult, selectedJoint } = useScreening();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const runAnalysis = async () => {
      try {
        if (!tempCameraAngles || Object.keys(tempCameraAngles).length === 0) {
          throw new Error("No camera data found. Please run the Camera Assessment first.");
        }

        // Progression animation
        for (let i = 0; i < STAGES.length - 1; i++) {
          if (!isMounted) return;
          setCurrentStageIndex(i);
          await new Promise(r => setTimeout(r, 500));
        }
        
        if (!isMounted) return;
        const cameraRes = await apiFetch(`/api/analyze/camera/${selectedJoint || "knee"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selectedJoint === "knee" ? tempCameraAngles : { joint_angles: tempCameraAngles })
        });
        
        if (!cameraRes.ok) {
          let errData: any;
          try { errData = await cameraRes.json(); } catch { errData = {}; }
          const detail = errData.detail;
          const msg = typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? `Validation error: ${detail.map((d: any) => d.msg).join(", ")}`
              : `Server error ${cameraRes.status}`;
          throw new Error(msg);
        }
        
        const data = await cameraRes.json();
        
        if (!isMounted) return;
        setCurrentStageIndex(STAGES.length - 1);
        
        setCameraResult({
          status: "success",
          probability: data.probability ?? data.camera_risk ?? 0.5,
          threshold: data.threshold ?? 0.5,
          result: data.result ?? data.camera_class ?? "Assessment complete",
          model_name: data.assessment_type === "movement_screening"
            ? `${selectedJoint}_movement_screening`
            : (selectedJoint === 'hip' ? "Model_C_Hip_RandomForest" : "Model_Stage2_Camera_RF"),
          evidence: data.evidence ?? []
        });
        
        setTimeout(() => {
          if (isMounted) router.push("/screening/results");
        }, 900);

      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to analyze movement data.");
        }
      }
    };
    
    runAnalysis();

    return () => {
      isMounted = false;
    };
  }, [tempCameraAngles, setCameraResult, router, selectedJoint]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#FFEFEA] text-[#FF6B4A] border border-[#FFD8CC] mb-5 shadow-sm relative">
          <ActivityLogIcon className="w-10 h-10" />
          <div className="absolute inset-0 rounded-2xl border-2 border-[#FF6B4A] border-t-transparent animate-spin" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-1">Analyzing Kinematics</h1>
        <p className="text-gray-500 text-sm">Evaluating functional movement curves through joint ML ensembles...</p>
      </div>

      <div className="w-full bg-white border border-[#EBE8E3] p-8 rounded-3xl shadow-[0_15px_45px_-10px_rgba(0,0,0,0.03)]">
        <div className="space-y-4">
          {STAGES.map((stage, index) => {
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;
            const isPending = index > currentStageIndex;
            
            return (
              <motion.div 
                key={stage}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3.5 p-3 rounded-2xl transition-colors ${
                  isActive ? 'bg-[#FFF8F6] border border-[#FFD8CC]' : 'bg-transparent'
                }`}
              >
                <div className="w-6 flex justify-center">
                  {isCompleted ? (
                    <CheckCircledIcon className="w-5 h-5 text-emerald-600" />
                  ) : isActive ? (
                    <ReloadIcon className="w-5 h-5 text-[#FF6B4A] animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                  )}
                </div>
                <span className={`text-sm ${isActive ? 'font-bold text-[#FF6B4A]' : isCompleted ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
                  {stage}
                </span>
              </motion.div>
            );
          })}
        </div>
        
        {error && (
          <div className="mt-6 p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-center text-xs font-semibold flex items-center justify-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
