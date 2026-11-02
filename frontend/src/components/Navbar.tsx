"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Osteoarthritis", href: "/screening/questionnaire" },
    { label: "Osteoporosis", href: "/screening/osteoporosis" },
    { label: "ASHA Queue", href: "/screening/worker-queue" },
    { label: "DHO Map", href: "/dashboard" },
    { label: "Simulator", href: "/screening/lifestyle-simulator" },
    { label: "Model Card", href: "/model-card" },
    { label: "Ethics", href: "/ethical-ai" },
  ];

  return (
    <header className="sticky top-4 z-50 max-w-5xl mx-auto px-4 w-full">
      <div className="bg-white/90 backdrop-blur-md border border-[#EBE8E3] rounded-full px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-[6px] bg-gradient-to-tr from-[#EA580C] to-[#F97316] rotate-45 transform flex items-center justify-center shadow-sm shadow-orange-500/30" />
          <span className="font-extrabold text-base tracking-tight text-gray-900">
            swastik<span className="text-[#FF6B4A]">.ai</span>
          </span>
        </Link>

        {/* Center Links */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-gray-600">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  isActive
                    ? "text-[#EA580C] font-bold"
                    : "hover:text-black"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/#judge-demo"
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-black transition-colors hidden sm:block"
          >
            Judge Demo
          </Link>
          <Link
            href="/"
            className="bg-[#18181B] hover:bg-black text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md shadow-black/10 hover:scale-102"
          >
            Start Triage
          </Link>
        </div>
      </div>
    </header>
  );
}
