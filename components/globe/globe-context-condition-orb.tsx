"use client";

import { cn } from "@/lib/utils";

export type GlobeContextConditionOrbProps = {
  className?: string;
  size?: "sm" | "md";
};

/** Context Condition AI accent — anchor executor, not Personal Context AI recall orb. */
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
      <div className="absolute inset-0 rounded-full bg-emerald-400/15 blur-md" />
      <div className="absolute inset-[12%] rounded-full bg-gradient-to-br from-emerald-300/35 to-teal-700/25 ring-1 ring-emerald-200/30" />
      <div className="absolute inset-[34%] rounded-full bg-emerald-50/90 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
      <svg
        className="absolute inset-[18%] text-emerald-900/55"
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
