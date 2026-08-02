"use client";

import { Check } from "lucide-react";
import type { Evidence } from "@/lib/callout/evidence";
import { cn } from "@/lib/utils";

export function CalloutEvidence({
  evidence,
  activeId,
  onSelect,
  className,
}: {
  evidence: readonly Evidence[];
  activeId?: string | null;
  onSelect?: (evidence: Evidence) => void;
  className?: string;
}) {
  const visible = evidence.filter((e) => e.present);
  if (visible.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[11px] font-semibold tracking-[0.02em] text-[#8b95a1]">
        Evidence
      </p>
      <ul className="space-y-1.5">
        {visible.map((ev) => {
          const active = activeId === ev.id;
          const clickable = Boolean(onSelect && ev.graphRef);
          return (
            <li key={ev.id}>
              <button
                type="button"
                disabled={!clickable}
                className={cn(
                  "flex w-full items-start gap-2 rounded-[12px] px-2.5 py-2 text-left text-[12px] transition-colors",
                  active
                    ? "bg-[#e8f3ff] text-[#191f28] ring-1 ring-[#3182f6]/35"
                    : "bg-white text-[#191f28] ring-1 ring-black/[0.04]",
                  clickable && "cursor-pointer active:scale-[0.99]",
                  !clickable && "cursor-default",
                )}
                onClick={() => {
                  if (clickable) onSelect?.(ev);
                }}
              >
                <Check
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    active ? "text-[#3182f6]" : "text-[#22c55e]",
                  )}
                  strokeWidth={2.8}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{ev.title}</span>
                  {ev.value ? (
                    <span className="mt-0.5 block text-[11px] font-medium text-[#4e5968]">
                      {ev.value}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
