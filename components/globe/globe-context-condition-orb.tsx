"use client";

import { cn } from "@/lib/utils";
import { RIMVIO_ACTION } from "@/lib/design/rimvio-ontology";

export type GlobeContextConditionOrbProps = {
  className?: string;
  size?: "sm" | "md";
};

/** 맥락 AI operator orb — system blue, aligned with RIMVIO_ACTION. */
export function GlobeContextConditionOrb({
  className,
  size = "sm",
}: GlobeContextConditionOrbProps) {
  const medium = size === "md";
  return (
    <div
      className={cn(
        "relative shrink-0",
        medium ? "size-9" : "size-7",
        className,
      )}
      aria-hidden
      data-globe-context-condition-orb
      data-globe-context-condition-orb-size={size}
    >
      <div
        className="absolute inset-0 rounded-full blur-md"
        style={{ backgroundColor: `${RIMVIO_ACTION.primary}22` }}
      />
      <div className="absolute inset-[12%] rounded-full bg-gradient-to-br from-sky-300/40 to-[#0071e3]/25 ring-1 ring-[#0071e3]/20" />
      <div className="absolute inset-[34%] rounded-full bg-white/92 shadow-[0_0_8px_rgba(0,113,227,0.45)]" />
      <svg
        className="absolute inset-[18%] text-[#0071e3]/65"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
