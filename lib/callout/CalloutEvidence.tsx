"use client";

import { Check } from "lucide-react";
import type { CalloutEvidence } from "@/lib/callout/types";
import { cn } from "@/lib/utils";

export function CalloutEvidence({
  evidence,
  className,
}: {
  evidence: readonly CalloutEvidence[];
  className?: string;
}) {
  if (evidence.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[11px] font-semibold tracking-[0.02em] text-[#8b95a1]">
        Evidence
      </p>
      <ul className="space-y-1.5">
        {evidence.map((ev) => (
          <li
            key={ev.id}
            className={cn(
              "flex items-start gap-2 rounded-[12px] px-2.5 py-2 text-[12px]",
              ev.present
                ? "bg-white text-[#191f28] ring-1 ring-black/[0.04]"
                : "bg-transparent text-[#c4c9d0]",
            )}
          >
            {ev.present ? (
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22c55e]"
                strokeWidth={2.8}
              />
            ) : (
              <span className="mt-0.5 h-3.5 w-3.5 shrink-0 text-center text-[10px]">
                ·
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{ev.labelKo}</span>
              {ev.detailKo ? (
                <span className="mt-0.5 block text-[11px] font-medium text-[#4e5968]">
                  {ev.detailKo}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
