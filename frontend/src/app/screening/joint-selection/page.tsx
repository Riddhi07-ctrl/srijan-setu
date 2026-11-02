"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeftIcon, 
  ChevronRightIcon, 
  ActivityLogIcon, 
  CameraIcon,
  ImageIcon
} from "@radix-ui/react-icons";

const protocols = [
  { 
    id: "hand", 
    label: "Hand Movement & Posture Analysis", 
    category: "Computer Vision",
    icon: "🖐️", 
    status: "ready", 
    desc: "MediaPipe hand landmark tracking for finger flexion arcs, dexterity, tremor & Heberden/Bouchard joint stiffness",
    href: "/screening/camera?joint=hand",
    featured: true
  },
  { 
    id: "knee", 
    label: "Knee Osteoarthritis Gait & Squat", 
    category: "Computer Vision",
    icon: "🦵", 
    status: "ready", 
    desc: "Real-time kinematic Knee Adduction Moment (KAM) estimation & bilateral flexion angle tracking",
    href: "/screening/camera?joint=knee"
  },
  { 
    id: "hip", 
    label: "Hip Functional Excursion", 
    category: "Computer Vision",
    icon: "🧍", 
    status: "ready", 
    desc: "Single-leg stance pelvic drop (Trendelenburg sign) & frontal plane stability classification",
    href: "/screening/camera?joint=hip"
  },
  { 
    id: "shoulder", 
    label: "Shoulder Range of Motion", 
    category: "Kinematics",
    icon: "💪", 
    status: "ready", 
    desc: "Bilateral arm abduction/external rotation biomechanics and rotator cuff impingement screening",
    href: "/screening/camera?joint=shoulder"
  },
  { 
    id: "spine", 
    label: "Spine & Postural Alignment", 
    category: "Computer Vision",
    icon: "🧘", 
    status: "ready", 
    desc: "Thoracic kyphosis curvature & sagittal balance screening for fragility wedge deformities",
    href: "/screening/camera?joint=spine"
  },
];

export default function JointSelectionPage() {
  const router = useRouter();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between mb-8">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back to Home
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFEFEA] text-[#E65100] border border-[#FFD8CC]">
          <ActivityLogIcon className="w-3.5 h-3.5" /> Protocol Selection
        </span>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
          Select Clinical Assessment Protocol
        </h1>
        <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
          Choose a screening pathway. Swastik combines non-invasive browser computer vision for joint biomechanics with deep convolutional neural networks for radiographic bone density.
        </p>
      </div>

      {/* Protocol Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {protocols.map((protocol, idx) => (
          <motion.div
            key={protocol.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            onClick={() => router.push(protocol.href)}
            className={`
              relative p-6 sm:p-8 rounded-3xl border cursor-pointer transition-all duration-300 flex flex-col justify-between
              bg-white hover:-translate-y-1 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.03)] hover:shadow-md
              ${protocol.featured 
                ? "border-[#FF6B4A]/40 ring-1 ring-[#FF6B4A]/20 bg-[#FFFAF8]" 
                : "border-[#EBE8E3] hover:border-[#FF6B4A]/40"}
            `}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{protocol.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FAF9F6] border border-[#EBE8E3] text-gray-600">
                  {protocol.category}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug">
                {protocol.label}
              </h3>
              <p className="text-gray-600 text-xs md:text-sm leading-relaxed mb-6">
                {protocol.desc}
              </p>
            </div>

            <div className="pt-4 border-t border-[#EBE8E3] flex items-center justify-between text-xs font-semibold text-[#FF6B4A]">
              <span>Launch Assessment</span>
              <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
