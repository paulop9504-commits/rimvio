"use client";

import { Loader2 } from "lucide-react";
import { useGlobeMapIntentPromptRail } from "@/hooks/use-globe-map-intent-prompt-rail";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeMapIntentPromptRailProps = {
  className?: string;
};

/** Directly above map prompt — shows parsed intent + context-linked chips. */
export function GlobeMapIntentPromptRail({ className }: GlobeMapIntentPromptRailProps) {
  const state = useGlobeMapIntentPromptRail();

  if (state.phase === "idle") {
    return null;
  }

  const intentLabel =
    state.phase === "pending" ? state.pending.intentLabelKo : state.ack.intentLabelKo;
  const chips =
    state.phase === "pending" ? state.pending.signalChips : state.ack.signalChips;
  const summary = state.phase === "ack" ? state.ack.summaryKo : null;
  const resourceCount =
    state.phase === "ack" ? state.ack.suppliedResourceCount : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-[0.9rem] bg-[#121316]/88 px-3 py-2 ring-1 ring-white/10 backdrop-blur-xl",
        className,
      )}
      data-globe-map-intent-prompt-rail
    >
      <div className="flex items-center gap-2">
        {state.phase === "pending" ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-[#7eb8ff]" aria-hidden />
        ) : (
          <span className="size-2 shrink-0 rounded-full bg-[#34c759] shadow-[0_0_8px_rgba(52,199,89,0.55)]" />
        )}
        <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white">
          {state.phase === "pending"
            ? copy.globe.intentSupplyPending(intentLabel)
            : copy.globe.intentSupplyConnected(intentLabel)}
        </p>
        {resourceCount != null && resourceCount > 0 ? (
          <span className="shrink-0 text-[10px] font-medium text-white/60">
            {copy.globe.intentSupplyResourceCount(resourceCount)}
          </span>
        ) : null}
      </div>

      {summary ? (
        <p className="line-clamp-2 text-[10px] leading-snug text-white/78">{summary}</p>
      ) : null}

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-medium text-white/80 ring-1 ring-white/10"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
