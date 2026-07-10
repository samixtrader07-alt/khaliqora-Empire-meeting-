import React from "react";

interface KhaliqoraLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function KhaliqoraLogo({ className = "", iconOnly = false, size = "md" }: KhaliqoraLogoProps) {
  // Determine pixel sizes based on prop
  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
    xl: "h-28 w-28",
  };

  const currentIconSize = iconSizes[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {/* Sleek chrome metallic SVG logo reflecting the uploaded image */}
      <svg
        className={`${currentIconSize} transition-all duration-300 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]`}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Silver/Chrome Linear Gradients */}
          <linearGradient id="chromeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="75%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          <linearGradient id="chromeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id="chromeGradAccent" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Deep dark glow */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Shadow Circle Accent */}
        <circle cx="100" cy="100" r="90" fill="#0d0f12" fillOpacity="0.4" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.05" />

        {/* LEFT LOOP / TAIL (Sleek curve wrapping around to the center) */}
        <path
          d="M 50,110 C 25,80 60,40 100,85 C 110,95 115,105 100,125 C 80,150 40,140 50,110 Z"
          fill="url(#chromeGrad1)"
          opacity="0.85"
        />

        {/* RIGHT LOOP / TAIL (Symmetrical sleek curve crossing the center) */}
        <path
          d="M 150,110 C 175,80 140,40 100,85 C 90,95 85,105 100,125 C 120,150 160,140 150,110 Z"
          fill="url(#chromeGrad2)"
          opacity="0.85"
        />

        {/* MAIN SYSTYLIZED "K" ELEMENT (Rising spire with diagonal sweeping arms) */}
        {/* Left vertical vertical/curved spine of the K */}
        <path
          d="M 85,60 C 85,60 75,100 80,140 C 82,148 92,148 90,140 C 85,110 95,85 95,60 C 95,54 85,54 85,60 Z"
          fill="url(#chromeGradAccent)"
        />

        {/* Upper diagonal arm of the K rising up right */}
        <path
          d="M 90,105 C 105,95 125,75 135,65 C 140,60 145,68 138,75 C 125,88 105,108 90,118 Z"
          fill="url(#chromeGrad1)"
        />

        {/* Lower diagonal arm of the K sweeping down right */}
        <path
          d="M 90,110 C 105,120 120,135 135,145 C 140,148 145,140 138,133 C 125,122 108,108 90,98"
          fill="url(#chromeGrad2)"
        />

        {/* Central Crown/Aesthetic Cap */}
        <path
          d="M 100,45 L 112,65 C 112,65 100,60 100,68 C 100,60 88,65 88,65 L 100,45 Z"
          fill="url(#chromeGradAccent)"
        />
      </svg>

      {!iconOnly && (
        <div className="mt-3">
          <h2 className="text-xl font-extrabold tracking-[0.25em] text-white font-sans uppercase leading-none select-none">
            KHALIQORA
          </h2>
          <p className="text-[8px] text-slate-500 font-mono tracking-[0.35em] uppercase mt-1.5 select-none font-bold">
            GLOBAL PARENT COMPANY
          </p>
        </div>
      )}
    </div>
  );
}
