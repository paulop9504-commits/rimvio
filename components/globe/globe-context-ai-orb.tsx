"use client";

import { cn } from "@/lib/utils";
import { RIMVIO_ACTION } from "@/lib/design/rimvio-ontology";

export type GlobeContextAiOrbProps = {
  className?: string;
  size?: "sm" | "lg";
};

/** Personal recall ask orb — cool blue family, harmonized with 맥락 AI. */
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
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ backgroundColor: `${RIMVIO_ACTION.primary}18` }}
      />
      <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-sky-300/28 via-[#0071e3]/14 to-indigo-600/22 blur-[1px]" />
      <div className="absolute inset-[10%] rounded-full bg-gradient-to-tr from-white/16 via-sky-100/12 to-transparent ring-1 ring-white/25 backdrop-blur-md" />
      <div className="absolute inset-[22%] rounded-full border border-white/14" />
      <div className="absolute inset-[36%] rounded-full border border-[#0071e3]/12" />
      <div
        className={cn(
          "absolute rounded-full bg-sky-200 shadow-[0_0_14px_rgba(90,200,250,0.85)]",
          large ? "left-[24%] top-[28%] size-2.5" : "left-[22%] top-[30%] size-2",
        )}
      />
      <div
        className={cn(
          "absolute rounded-full bg-[#0071e3]/80 shadow-[0_0_10px_rgba(0,113,227,0.75)]",
          large ? "right-[26%] top-[34%] size-2" : "right-[24%] top-[42%] size-1.5",
        )}
      />
      <div
        className={cn(
          "absolute rounded-full bg-indigo-300/90 shadow-[0_0_8px_rgba(129,140,248,0.7)]",
          large ? "bottom-[30%] left-[40%] size-1.5" : "bottom-[28%] left-[38%] size-1",
        )}
      />
      <svg
        className="absolute inset-[18%] text-white/22"
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
