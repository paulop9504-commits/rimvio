"use client";

import { X } from "lucide-react";
import type { IntentState } from "@/lib/portal/compose-intent/intent-state-types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ComposeIntentSpectrumBarProps = {
  intentStage: IntentState;
  onReset: () => void;
  className?: string;
};

const STAGES = [
  { id: "chatting", labelKo: copy.globe.intentSpectrumChat },
  { id: "soft_signal", labelKo: copy.globe.intentSpectrumSoft },
  { id: "confirmed", labelKo: copy.globe.intentSpectrumConfirmed },
] as const;

function readActiveIndex(stage: IntentState["stage"]): number {
  if (stage === "confirmed") {
    return 2;
  }
  if (stage === "soft_signal") {
    return 1;
  }
  return 0;
}

/** Compact intent spectrum — fixed below chat header when intent is captured. */
export function ComposeIntentSpectrumBar({
  intentStage,
  onReset,
  className,
}: ComposeIntentSpectrumBarProps) {
  if (intentStage.stage === "chatting") {
    return null;
  }

  const activeIndex = readActiveIndex(intentStage.stage);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-b border-white/8 px-3 py-1.5",
        className,
      )}
      data-compose-intent-spectrum
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {STAGES.map((stage, index) => {
          const active = index <= activeIndex;
          return (
            <div key={stage.id} className="flex min-w-0 flex-1 items-center gap-1">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full transition-colors",
                  active ? "bg-[#34c759]" : "bg-white/20",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "truncate text-[10px] font-medium",
                  active ? "text-white/88" : "text-white/35",
                )}
              >
                {stage.labelKo}
              </span>
              {index < STAGES.length - 1 ? (
                <span className="mx-0.5 h-px min-w-[6px] flex-1 bg-white/12" aria-hidden />
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/70 ring-1 ring-white/10"
        aria-label={copy.globe.intentSpectrumResetAria}
      >
        <X className="size-3" aria-hidden />
      </button>
    </div>
  );
}
