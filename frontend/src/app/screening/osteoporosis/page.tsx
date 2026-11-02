"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeftIcon, 
  ChevronRightIcon, 
  ActivityLogIcon, 
  MixerHorizontalIcon,
  CheckCircledIcon,
  FileTextIcon,
  LayersIcon
} from "@radix-ui/react-icons";

export default function OsteoporosisPathwayPage() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between mb-8">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back to Home
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFEFEA] text-[#E65100] border border-[#FFD8CC]">
          <ActivityLogIcon className="w-3.5 h-3.5" /> Osteoporosis Screening Pathway
        </span>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
          Select Osteoporosis Evaluation Pathway
        </h1>
        <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
          Swastik supports dual clinical workflows: directly analyzing confirmed DEXA bone densitometry metrics, or pre-screening individuals who have never had a DEXA scan using non-invasive clinical biomarkers and radiographic AI.
        </p>
      </div>

      {/* Dual Pathway Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        
        {/* Pathway 1: WITH DEXA SCAN */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => router.push("/screening/osteoporosis/questionnaire")}
          className="relative p-8 rounded-3xl border border-[#EBE8E3] hover:border-[#FF6B4A]/40 bg-white hover:-translate-y-1 transition-all duration-300 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.03)] hover:shadow-lg cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-4xl">📊</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Clinical Densitometry
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 mb-2 group-hover:text-[#FF6B4A] transition-colors">
              I Have a DEXA Scan Report
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Enter your official Dual-energy X-ray Absorptiometry (DEXA) T-scores and serum biochemical bone turnover markers for multi-parameter risk analysis.
            </p>

            <div className="space-y-2.5 bg-[#FAF9F6] p-4 rounded-2xl border border-[#EBE8E3] mb-6">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <CheckCircledIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Spine L1–L4 T-Score & Femoral Neck BMD</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <CheckCircledIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Serum Calcium, Calcitriol & Calcitonin turnover</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <CheckCircledIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>WHO Diagnostic Stratification & Machine Learning synthesis</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EBE8E3] flex items-center justify-between text-xs font-bold text-[#FF6B4A]">
            <span>Enter DEXA & Lab Biomarkers</span>
            <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </motion.div>

        {/* Pathway 2: WITHOUT DEXA SCAN */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={() => router.push("/screening/osteoporosis/basic-questionnaire")}
          className="relative p-8 rounded-3xl border border-[#FF6B4A]/40 ring-1 ring-[#FF6B4A]/20 bg-[#FFFAF8] hover:-translate-y-1 transition-all duration-300 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.03)] hover:shadow-lg cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-4xl">🦴</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#FFEFEA] text-[#E65100] border border-[#FFD8CC]">
                Community Triage Mode
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 mb-2 group-hover:text-[#FF6B4A] transition-colors">
              I Do NOT Have a DEXA Scan
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Non-invasive frontline pre-screening designed for underserved clinics. Triages bone fragility risk and prioritizes who truly needs scarce confirmatory DEXA slots.
            </p>

            <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-[#FFD8CC] mb-6">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <CheckCircledIcon className="w-4 h-4 text-[#FF6B4A] flex-shrink-0" />
                <span>10-Point Non-Invasive Lifestyle & Fragility Profile</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <CheckCircledIcon className="w-4 h-4 text-[#FF6B4A] flex-shrink-0" />
                <span>DenseNet-121 Deep Bone Radiographic Attenuation</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <CheckCircledIcon className="w-4 h-4 text-[#FF6B4A] flex-shrink-0" />
                <span>Grad-CAM Explainability Heatmaps & DEXA Triage referral</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#FFD8CC] flex items-center justify-between text-xs font-bold text-[#FF6B4A]">
            <span>Start Non-Invasive Pre-Screening</span>
            <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </motion.div>

      </div>

      {/* Helpful Clinical Explanation */}
      <div className="bg-white border border-[#EBE8E3] rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFEFEA] border border-[#FFD8CC] flex items-center justify-center shrink-0">
            <LayersIcon className="w-6 h-6 text-[#FF6B4A]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Why We Prioritize Pre-Screening Before DEXA
            </h3>
            <p className="text-xs md:text-sm text-gray-600 leading-relaxed max-w-2xl">
              DEXA scanners are costly and scarce in rural and district hospitals. Swastik’s pre-screening model filters out low-risk individuals and prioritizes those with clinical vulnerability for confirmatory imaging, reducing systemic healthcare costs by up to 63%.
            </p>
          </div>
        </div>
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#FAF9F6] border border-[#EBE8E3] text-gray-800 hover:bg-white hover:border-[#FF6B4A] transition-all shrink-0"
        >
          View Health Economics <ChevronRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
