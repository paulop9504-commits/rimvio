"use client";

import { cn } from "@/lib/utils";

export type GlobeContextAiOrbProps = {
  className?: string;
  size?: "sm" | "lg";
};

/** Decorative context orb — ask sheet hero accent. */
export function GlobeContextAiOrb({ className, size = "sm" }: GlobeContextAiOrbProps) {
  const large = size === "lg";
  return (
    <div
      className={cn(
        "relative mx-auto",
        large ? "size-[7.5rem]" : "size-[4.5rem]",
        className,
      )}
      aria-hidden
      data-globe-context-ai-orb
      data-globe-context-ai-orb-size={size}
    >
      <div className="absolute inset-0 rounded-full bg-[#ff6b4a]/18 blur-2xl" />
      <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-cyan-300/30 via-sky-400/12 to-indigo-700/25 blur-[1px]" />
      <div className="absolute inset-[10%] rounded-full bg-gradient-to-tr from-white/14 via-cyan-200/10 to-transparent ring-1 ring-white/25 backdrop-blur-md" />
      <div className="absolute inset-[22%] rounded-full border border-white/12" />
      <div className="absolute inset-[36%] rounded-full border border-cyan-100/15" />
      <div
        className={cn(
          "absolute rounded-full bg-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.95)]",
          large ? "left-[24%] top-[28%] size-2.5" : "left-[22%] top-[30%] size-2",
        )}
      />
      <div
        className={cn(
          "absolute rounded-full bg-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.85)]",
          large ? "right-[26%] top-[34%] size-2" : "right-[24%] top-[42%] size-1.5",
        )}
      />
      <div
        className={cn(
          "absolute rounded-full bg-rose-300/90 shadow-[0_0_8px_rgba(251,113,133,0.8)]",
          large ? "bottom-[30%] left-[40%] size-1.5" : "bottom-[28%] left-[38%] size-1",
        )}
      />
      <svg
        className="absolute inset-[18%] text-white/20"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <path
          d="M28 34 C42 42, 58 26, 72 38 M24 58 C38 48, 62 62, 76 52"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}
