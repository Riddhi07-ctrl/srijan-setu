"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  PlayIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  Cross2Icon,
  PersonIcon,
  MagicWandIcon,
  MixerHorizontalIcon,
  FileTextIcon,
  CheckCircledIcon,
  ActivityLogIcon,
  LockClosedIcon,
  LayersIcon,
  LightningBoltIcon,
  DrawingPinIcon,
  Share1Icon,
  Link2Icon,
  PaperPlaneIcon,
  SunIcon,
  CheckIcon
} from "@radix-ui/react-icons";
import { useState } from "react";
import { usePatient, generateScreeningId } from "@/context/PatientContext";
import { useRouter } from "next/navigation";
import { useScreening } from "@/context/ScreeningContext";

export default function LandingPage() {
  const { resetAll, setClinicalResult, setImagingResult } = useScreening();
  const { setPatient } = usePatient();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [selectedFlow, setSelectedFlow] = useState<"oa" | "osteo">("oa");

  const handleStartScreening = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientId.trim()) return;
    
    resetAll();
    setPatient({
      patientName,
      patientId,
      screeningId: generateScreeningId(),
      screeningStartedAt: new Date().toISOString(),
      age: 55,
      gender: "Female"
    });

    if (selectedFlow === "oa") {
      router.push("/screening/questionnaire");
    } else {
      router.push("/screening/osteoporosis");
    }
  };

  // ─── Judge Demo Quick-Launch Cases ─────────────────────────────────────────
  const launchDemoCase = (caseType: "high_risk" | "borderline" | "healthy") => {
    resetAll();

    if (caseType === "high_risk") {
      setPatient({
        patientName: "Smt. Paramjit Kaur",
        patientId: "DEMO-PB-081",
        screeningId: "SCR-DEMO-HIGH",
        screeningStartedAt: new Date().toISOString(),
        age: 67,
        gender: "Female"
      });

      setClinicalResult({
        status: "success",
        probability: 0.88,
        threshold: 0.45,
        result: "Osteoporosis",
        model_name: "Clinical_XGBoost_Ensemble (Real Model)",
        evidence: [
          "1. Prior Low-Trauma Wrist Fracture recorded.",
          "2. Severe functional limitation index (WOMAC 62/96).",
          "3. Age 67 combined with low dietary calcium intake."
        ]
      });

      setImagingResult({
        status: "success",
        probability: 0.84,
        threshold: 0.35,
        result: "Osteoporosis",
        model_name: "DenseNet-121 Clean (CLAHE + Grad-CAM)",
        bone_health_age: 79,
        screening_tier: "High Risk / Immediate DEXA Recommended",
        probabilities: {
          "Normal": 5.4,
          "Osteopenia": 10.6,
          "Osteoporosis": 84.0
        },
        quality_passed: true,
        gradcam_image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 360 360'><rect width='360' height='360' fill='%23111827'/><circle cx='180' cy='180' r='110' fill='%23ef4444' opacity='0.45' filter='blur(20px)'/><circle cx='195' cy='160' r='60' fill='%23f59e0b' opacity='0.55' filter='blur(15px)'/><text x='180' y='330' font-family='sans-serif' font-size='12' fill='%23e5e7eb' text-anchor='middle'>Trabecular Bone Demineralization Zone</text></svg>"
      });

      router.push("/screening/osteoporosis/results");
    } 
    else if (caseType === "borderline") {
      setPatient({
        patientName: "Sh. Harpreet Singh",
        patientId: "DEMO-PB-082",
        screeningId: "SCR-DEMO-MOD",
        screeningStartedAt: new Date().toISOString(),
        age: 54,
        gender: "Male"
      });

      setClinicalResult({
        status: "success",
        probability: 0.48,
        threshold: 0.45,
        result: "Osteopenia",
        model_name: "Clinical_XGBoost_Ensemble (Real Model)",
        evidence: [
          "1. Mild-to-moderate joint stiffness in morning.",
          "2. Sedentary metabolic profile (BMI 27.2)."
        ]
      });

      setImagingResult({
        status: "success",
        probability: 0.45,
        threshold: 0.35,
        result: "Osteopenia",
        model_name: "DenseNet-121 Clean (CLAHE + Grad-CAM)",
        bone_health_age: 58,
        screening_tier: "Moderate Risk / Lifestyle & Calcium Follow-up",
        probabilities: {
          "Normal": 24.5,
          "Osteopenia": 58.2,
          "Osteoporosis": 17.3
        },
        quality_passed: true,
        gradcam_image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 360 360'><rect width='360' height='360' fill='%23111827'/><circle cx='170' cy='190' r='85' fill='%23f59e0b' opacity='0.45' filter='blur(18px)'/><text x='180' y='330' font-family='sans-serif' font-size='12' fill='%23e5e7eb' text-anchor='middle'>Early Cortical Thinning Zone</text></svg>"
      });

      router.push("/screening/osteoporosis/results");
    } 
    else {
      setPatient({
        patientName: "Smt. Sunita Sharma",
        patientId: "DEMO-PB-084",
        screeningId: "SCR-DEMO-NORM",
        screeningStartedAt: new Date().toISOString(),
        age: 38,
        gender: "Female"
      });

      setClinicalResult({
        status: "success",
        probability: 0.08,
        threshold: 0.45,
        result: "Normal",
        model_name: "Clinical_XGBoost_Ensemble (Real Model)",
        evidence: ["Healthy physical activity levels, zero fracture history."]
      });

      setImagingResult({
        status: "success",
        probability: 0.06,
        threshold: 0.35,
        result: "Normal",
        model_name: "DenseNet-121 Clean (CLAHE + Grad-CAM)",
        bone_health_age: 34,
        screening_tier: "Low Risk / Age-Appropriate Baseline",
        probabilities: {
          "Normal": 89.2,
          "Osteopenia": 8.1,
          "Osteoporosis": 2.7
        },
        quality_passed: true,
        gradcam_image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 360 360'><rect width='360' height='360' fill='%23111827'/><circle cx='180' cy='180' r='70' fill='%2310b981' opacity='0.35' filter='blur(25px)'/><text x='180' y='330' font-family='sans-serif' font-size='12' fill='%23e5e7eb' text-anchor='middle'>Homogeneous Mineral Attenuation</text></svg>"
      });

      router.push("/screening/osteoporosis/results");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#18181B] selection:bg-[#FF6B4A]/20 selection:text-[#EA580C] font-sans relative overflow-x-hidden">
      
      {/* ─── HERO SECTION WITH RADIANT PEACH GLOW & PHONE (Image 1) ──────── */}
      <section id="hero" className="relative pt-12 pb-24 md:pt-16 md:pb-32 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          
          {/* Main Hero Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#18181B] mb-5 leading-[1.08] max-w-4xl mx-auto"
          >
            Effortless Clinical <span className="text-[#FF6B4A]">Screening</span> <br />
            That Makes Life <span className="text-[#FF7A59]">Easier</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto mb-8 font-normal leading-relaxed"
          >
            Screen joint and bone health with a single click. Go from patient symptoms to prioritized clinical referrals with ease using Swastik AI, your clinical decision intelligence.
          </motion.p>

          {/* Dual Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-3.5 mb-12"
          >
            <button
              onClick={() => { setSelectedFlow("oa"); setShowModal(true); }}
              className="bg-[#18181B] hover:bg-black text-white px-7 py-3 rounded-xl font-bold text-sm shadow-lg shadow-black/10 hover:shadow-black/20 hover:scale-102 transition-all flex items-center gap-2"
            >
              <ActivityLogIcon className="w-4 h-4 text-emerald-400" /> Start Osteoarthritis Screen
            </button>

            <button
              onClick={() => { setSelectedFlow("osteo"); setShowModal(true); }}
              className="bg-gradient-to-r from-[#FF6B4A] to-[#FF5722] hover:opacity-95 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-102 transition-all flex items-center gap-2"
            >
              <LayersIcon className="w-4 h-4" /> Start Osteoporosis Screen
            </button>
          </motion.div>

          {/* ─── Glowing Peach Radiant Arc & Phone Device Mockup ───────────── */}
          <div className="relative pt-8 pb-16 max-w-4xl mx-auto">
            {/* Ambient Peach Glow Box with concentric rings */}
            <div className="absolute inset-0 top-12 rounded-[48px] bg-gradient-to-b from-[#FFF5F0] via-[#FFEBE3] to-[#FFDFC8]/45 border border-[#FFE7DF] pointer-events-none" />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[520px] h-[520px] rounded-full border border-orange-300/20" />
              <div className="w-[740px] h-[740px] rounded-full border border-orange-300/15" />
            </div>

            {/* Emerging Phone Mockup (iPhone with Dynamic Island) */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative z-20 w-[310px] sm:w-[350px] mx-auto bg-black rounded-[46px] p-3 shadow-[0_30px_70px_-15px_rgba(234,88,12,0.22)] border-[5px] border-[#27272A]"
            >
              {/* Phone Inner Screen */}
              <div className="bg-[#FAF9F6] rounded-[38px] p-5 text-left border border-gray-100 shadow-inner">
                {/* Dynamic Island */}
                <div className="w-24 h-5 bg-black rounded-full mx-auto mb-4 flex items-center justify-between px-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-[#18181B]" />
                </div>

                {/* Top Status inside App */}
                <div className="flex items-center justify-between mb-4 text-xs">
                  <span className="font-bold text-gray-900 flex items-center gap-1.5">
                    <MagicWandIcon className="w-3.5 h-3.5 text-[#FF6B4A]" /> Screening Schedule
                  </span>
                  <Link href="/screening/worker-queue" className="text-gray-500 hover:text-black font-medium">
                    See all &gt;
                  </Link>
                </div>

                {/* Active Patient Card 1 */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm mb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">Smt. Paramjit Kaur</h4>
                      <p className="text-[11px] text-gray-500">10:14 AM • Mullanpur PHC</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FFEFEA] text-[#E65100]">
                      High Risk
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 border border-white text-[9px] font-bold text-white flex items-center justify-center">
                        PK
                      </div>
                      <div className="w-5 h-5 rounded-full bg-gray-900 border border-white text-[9px] font-bold text-white flex items-center justify-center">
                        DR
                      </div>
                      <div className="w-5 h-5 rounded-full bg-gray-200 border border-white text-[9px] font-semibold text-gray-700 flex items-center justify-center">
                        +2
                      </div>
                    </div>
                    <span className="text-[10px] text-[#FF6B4A] font-semibold">
                      DenseNet Grad-CAM
                    </span>
                  </div>
                </div>

                {/* Active Patient Card 2 */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">Sh. Harpreet Singh</h4>
                      <p className="text-[11px] text-gray-500">10:45 AM • Gait Asymmetry</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Borderline
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Single Leg Stance: 5.2s</span>
                    <span className="font-bold text-emerald-600">Vit-D Rx</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── JUDGE FAST-TRACK DEMO BAR (Card Style) ─────────────────────────── */}
      <section id="judge-demo" className="max-w-5xl mx-auto px-6 mb-20 relative z-20">
        <div className="bg-white border border-[#EBE8E3] rounded-3xl p-6 md:p-8 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-gray-100 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#EA580C] flex items-center justify-center">
                <PlayIcon className="w-4 h-4 fill-[#EA580C]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Judge Fast-Track Demo Mode (Preloaded Sample Cohort)
              </span>
            </div>
            <span className="text-xs text-gray-400 font-medium">Zero-latency instant clinical review</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <button
              onClick={() => launchDemoCase("high_risk")}
              className="p-4 rounded-2xl bg-rose-50/60 hover:bg-rose-50 border border-rose-200/80 text-left transition-all hover:scale-102 group shadow-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-rose-600 uppercase">Case A • High Risk</span>
                <ChevronRightIcon className="w-4 h-4 text-rose-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="font-bold text-gray-900 text-sm">Smt. Paramjit Kaur (67F)</p>
              <p className="text-xs text-gray-500 mt-1">Severe trabecular bone loss + knee OA (Immediate DEXA Referral)</p>
            </button>

            <button
              onClick={() => launchDemoCase("borderline")}
              className="p-4 rounded-2xl bg-amber-50/60 hover:bg-amber-50 border border-amber-200/80 text-left transition-all hover:scale-102 group shadow-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-amber-700 uppercase">Case B • Borderline</span>
                <ChevronRightIcon className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="font-bold text-gray-900 text-sm">Sh. Harpreet Singh (54M)</p>
              <p className="text-xs text-gray-500 mt-1">Early osteopenia & joint stiffness (Vit-D & Physio routine)</p>
            </button>

            <button
              onClick={() => launchDemoCase("healthy")}
              className="p-4 rounded-2xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/80 text-left transition-all hover:scale-102 group shadow-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-emerald-700 uppercase">Case C • Healthy</span>
                <ChevronRightIcon className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="font-bold text-gray-900 text-sm">Smt. Sunita Sharma (38F)</p>
              <p className="text-xs text-gray-500 mt-1">Normal mineral baseline & symmetric gait arc</p>
            </button>
          </div>
        </div>
      </section>

      {/* ─── IN-BUILT AI INTEGRATION (Image 2 Bento Grid) ────────────────────── */}
      <section id="integration" className="max-w-5xl mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
            In built <span className="text-[#FF6B4A]">AI Integration</span>
          </h2>
          <p className="text-gray-500 text-base max-w-2xl mx-auto">
            With AI advancing each passing day, we integrated computer vision kinematics, tabular clinical ML, and DenseNet-121 Grad-CAM heatmaps at the most crucial triage moments.
          </p>
        </div>

        {/* 3 Floating Cards (Matching Image 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Chat with screenings */}
          <div className="bg-white border border-[#EBE8E3] rounded-3xl p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-[0_20px_50px_-10px_rgba(234,88,12,0.08)] transition-all">
            <div>
              {/* Chat Interface Mockup */}
              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-gray-100 mb-6 space-y-3">
                <div className="bg-white p-2.5 rounded-xl text-xs text-gray-700 shadow-sm border border-gray-100 w-max max-w-[85%]">
                  Hello, Doctor! Swastik detected 84.0% trabecular porosity.
                </div>
                <div className="flex justify-end">
                  <span className="bg-[#FF6B4A] text-white text-xs font-semibold px-3 py-1 rounded-xl shadow-sm">
                    DEXA Indicated
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-gray-400 border-t border-gray-200/60">
                  <span className="text-[11px]">Type clinical question...</span>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Link2Icon className="w-3.5 h-3.5" />
                    <PaperPlaneIcon className="w-3.5 h-3.5 text-[#FF6B4A]" />
                  </div>
                </div>
              </div>

              <h3 className="font-extrabold text-gray-900 text-lg mb-1">Explain-It-To-Me AI Assistant</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Plain-language explanations in Hindi, Punjabi and English so patients understand risk without medical jargon.
              </p>
            </div>

            <Link
              href="/screening/lifestyle-simulator"
              className="mt-6 text-xs font-bold text-[#FF6B4A] flex items-center gap-1 hover:underline"
            >
              Open What-If Simulator <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Health Economics Card (Matching Image 2 Center) */}
          <div className="bg-white border border-[#EBE8E3] rounded-3xl p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-[0_20px_50px_-10px_rgba(234,88,12,0.08)] transition-all">
            <div>
              {/* Terracotta Credit-card Style Mockup */}
              <div className="text-center mb-6">
                <p className="text-3xl font-black text-gray-900 tracking-tight">₹ 14,500+</p>
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Avg. Rural Camp Savings</span>

                <div className="mt-3 bg-gradient-to-tr from-[#EA580C] to-[#FF7A59] p-4 rounded-2xl text-white text-left shadow-lg shadow-orange-500/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="w-6 h-4 bg-amber-200/80 rounded-sm" />
                    <span className="text-[10px] font-mono tracking-widest uppercase">Swastik Card</span>
                  </div>
                  <div className="font-mono text-sm tracking-widest mb-2">**** **** **** 2026</div>
                  <div className="flex justify-between text-[10px] text-white/80">
                    <span>Zero Hardware Cost</span>
                    <span>100% Browser</span>
                  </div>
                </div>
              </div>

              <h3 className="font-extrabold text-gray-900 text-lg mb-1">Rural Health Economics</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Saves ₹ 1,500 – ₹ 3,000 per patient by opportunistically screening via commodity phone cameras before ordering DEXA scans.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="mt-6 text-xs font-bold text-[#FF6B4A] flex items-center gap-1 hover:underline"
            >
              View DHO Economics <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: ASHA Team & Referrals (Matching Image 2 Right) */}
          <div className="bg-white border border-[#EBE8E3] rounded-3xl p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-[0_20px_50px_-10px_rgba(234,88,12,0.08)] transition-all">
            <div>
              {/* Team Invite / Referral Mockup */}
              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-gray-100 mb-6">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-[#FF6B4A]">+ Refer Patient</span>
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-[9px] text-white flex items-center justify-center font-bold">DR</div>
                    <div className="w-5 h-5 rounded-full bg-purple-600 text-[9px] text-white flex items-center justify-center font-bold">AS</div>
                    <div className="w-5 h-5 rounded-full bg-gray-300 text-[9px] text-gray-700 flex items-center justify-center font-bold">+4</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFEFEA] text-[#E65100]">
                    High Priority
                  </span>
                  <p className="font-bold text-gray-900 text-xs mt-1.5">Mullanpur Garibdass Camp</p>
                  <p className="text-[11px] text-gray-500">6 patients flagged for ortho review</p>
                </div>
              </div>

              <h3 className="font-extrabold text-gray-900 text-lg mb-1">ASHA Worker Queue</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Empowers frontline community health workers to triage patient after patient with 1-click batch referral export.
              </p>
            </div>

            <Link
              href="/screening/worker-queue"
              className="mt-6 text-xs font-bold text-[#FF6B4A] flex items-center gap-1 hover:underline"
            >
              Open Camp Queue <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FEATURES SO GOOD YOU'LL LOVE US (Image 3 Bento Grid) ────────────── */}
      <section className="max-w-5xl mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
            Features so good you'll <span className="text-[#FF6B4A]">Love us</span>
          </h2>
          <p className="text-gray-500 text-base max-w-2xl mx-auto">
            Packed with technical rigor and clinical validation, built for maximum impact in frontline healthcare delivery.
          </p>
        </div>

        {/* 2 Big Bento Cards (Matching Image 3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bento Card Left: District Map */}
          <div className="bg-white border border-[#EBE8E3] rounded-3xl p-7 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-[0_20px_50px_-10px_rgba(234,88,12,0.08)] transition-all">
            {/* Map Mockup */}
            <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-gray-100 mb-6 relative overflow-hidden min-h-[180px] flex items-center justify-center">
              {/* Dot matrix background simulation */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#18181B_1px,transparent_1px)] [background-size:12px_12px]" />
              
              {/* Floating Location Badges */}
              <div className="relative z-10 w-full flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="bg-[#18181B] text-white text-[11px] font-bold px-3 py-1 rounded-xl shadow-md flex items-center gap-1.5">
                    <DrawingPinIcon className="w-3 h-3 text-[#FF6B4A]" /> PGIMER Chandigarh
                  </div>
                  <div className="bg-white text-gray-900 text-[11px] font-bold px-3 py-1 rounded-xl shadow-sm border border-gray-200">
                    Mohali (Phase VIII)
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="bg-[#FFEFEA] border border-[#FFD8CC] text-[#E65100] text-xs font-extrabold px-4 py-1.5 rounded-full shadow-sm">
                    Mullanpur PHC • 84% Camp Risk Flag
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-extrabold text-gray-900 text-xl mb-1.5">District Health Officer Surveillance</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Target screening camps directly to high-prevalence villages in Punjab and Chandigarh using live geographic heatmaps.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="mt-6 text-xs font-bold text-[#FF6B4A] flex items-center gap-1 hover:underline"
            >
              Open DHO Command <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Bento Card Right: Superb Analytics */}
          <div className="bg-white border border-[#EBE8E3] rounded-3xl p-7 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-[0_20px_50px_-10px_rgba(234,88,12,0.08)] transition-all">
            {/* Chart Widget Mockup */}
            <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-gray-100 mb-6 relative min-h-[180px] flex flex-col justify-between">
              {/* Mac Traffic Dots */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>

              {/* Bar Chart Simulation */}
              <div className="flex items-end justify-center gap-4 h-24 pt-4">
                <div className="w-8 bg-gray-200 rounded-t-lg h-[40%]" />
                <div className="w-8 bg-gray-300 rounded-t-lg h-[65%]" />
                <div className="w-8 bg-gradient-to-t from-[#EA580C] to-[#FF7A59] rounded-t-lg h-[92%] relative shadow-sm">
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[#EA580C]">91.8%</span>
                </div>
                <div className="w-8 bg-gray-200 rounded-t-lg h-[50%]" />
              </div>

              {/* Share Pill */}
              <div className="flex justify-end">
                <span className="bg-[#18181B] text-white text-[10px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Share1Icon className="w-2.5 h-2.5" /> Share
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-extrabold text-gray-900 text-xl mb-1.5">Superb Clinical Validation</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                DenseNet-121 clean architecture tested on N=1,147 radiographs with patient-grouped cross-validation, achieving 91.8% screening referral sensitivity.
              </p>
            </div>

            <Link
              href="/model-card"
              className="mt-6 text-xs font-bold text-[#FF6B4A] flex items-center gap-1 hover:underline"
            >
              Read Model Card Benchmark <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PEOPLE LOVE US & CIRCULAR ORBIT (Image 4) ───────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 mb-24">
        <div className="bg-white border border-[#EBE8E3] rounded-3xl p-8 md:p-12 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.04)] grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Testimonial & Benefits */}
          <div className="md:col-span-6 space-y-5">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              <span className="text-[#FF6B4A]">Clinicians</span> Trust Us
            </h2>
            
            <p className="text-gray-500 text-sm leading-relaxed">
              Designed in collaboration with frontline community health workers and orthopedic specialists for genuine public health impact.
            </p>

            <ul className="space-y-3 pt-2 text-xs text-gray-700">
              <li className="flex items-center gap-2.5 font-medium">
                <div className="w-4 h-4 rounded-full bg-orange-100 text-[#EA580C] flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="w-3 h-3" />
                </div>
                <span>Zero patient data retention (DPDP Act 2023 compliant)</span>
              </li>
              <li className="flex items-center gap-2.5 font-medium">
                <div className="w-4 h-4 rounded-full bg-orange-100 text-[#EA580C] flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="w-3 h-3" />
                </div>
                <span>Transparent XAI Grad-CAM condylar attention verification</span>
              </li>
              <li className="flex items-center gap-2.5 font-medium">
                <div className="w-4 h-4 rounded-full bg-orange-100 text-[#EA580C] flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="w-3 h-3" />
                </div>
                <span>Active human-in-the-loop diagnostic feedback telemetry</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                onClick={() => { setSelectedFlow("osteo"); setShowModal(true); }}
                className="bg-[#18181B] hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-black/10 hover:scale-102 transition-all"
              >
                Get Started Now
              </button>
            </div>
          </div>

          {/* Right Column: Circular Orbit Animation (Matching Image 4) */}
          <div className="md:col-span-6 relative flex items-center justify-center min-h-[300px]">
            {/* Center glowing lightning badge */}
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#EBE8E3] shadow-xl shadow-orange-500/10 flex items-center justify-center z-10">
              <LightningBoltIcon className="w-8 h-8 text-[#FF6B4A]" />
            </div>

            {/* Concentric subtle orbit circles */}
            <div className="absolute w-52 h-52 rounded-full border border-gray-200 border-dashed pointer-events-none" />
            <div className="absolute w-72 h-72 rounded-full border border-gray-100 pointer-events-none" />

            {/* Orbiting Avatars (Matching Image 4) */}
            <div className="absolute top-4 right-16 w-12 h-12 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 border-2 border-white shadow-md flex items-center justify-center text-xs font-bold text-white">
              DR
            </div>

            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F97316] border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold text-white">
              ASHA
            </div>

            <div className="absolute bottom-4 right-20 w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 border-2 border-white shadow-md flex items-center justify-center text-xs font-bold text-white">
              MO
            </div>

            <div className="absolute top-1/2 right-2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-200 border border-white opacity-40" />
            <div className="absolute top-2 left-20 w-8 h-8 rounded-full bg-gray-200 border border-white opacity-30" />
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#EBE8E3] bg-white py-12 px-6 text-center text-xs text-gray-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-[4px] bg-gradient-to-tr from-[#EA580C] to-[#F97316] rotate-45 transform" />
            <span className="font-extrabold text-gray-900">Swastik Health</span>
            <span>• Rural Musculoskeletal Decision Support</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/ethical-ai" className="hover:text-black">Governance & Privacy</Link>
            <Link href="/model-card" className="hover:text-black">Model Card</Link>
            <a href="https://github.com/Anannya-Vyas/srijansetu-hackathon-" target="_blank" rel="noreferrer" className="hover:text-black">GitHub</a>
          </div>
        </div>
      </footer>

      {/* ─── PATIENT INTAKE MODAL (Styled in Shape.ai Aesthetic) ───────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#EBE8E3] p-8 rounded-3xl max-w-md w-full relative shadow-2xl"
          >
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Cross2Icon className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C]">
                <PersonIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Patient Intake</h2>
                <p className="text-xs text-[#EA580C] font-semibold">
                  {selectedFlow === "oa" ? "Osteoarthritis Screening Flow" : "Osteoporosis Radiographic Flow"}
                </p>
              </div>
            </div>
            
            <form onSubmit={handleStartScreening} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Patient Full Name</label>
                <input 
                  type="text" 
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-[#EA580C] focus:bg-white transition-all"
                  placeholder="e.g. Smt. Paramjit Kaur"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Patient ID / Aadhaar / MRN</label>
                <input 
                  type="text" 
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-[#EA580C] focus:bg-white transition-all"
                  placeholder="e.g. PB-2024-9182"
                  required
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full py-3.5 bg-gradient-to-r from-[#FF6B4A] to-[#FF5722] hover:opacity-95 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 hover:scale-102"
                >
                  Proceed to Clinical Intake
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
