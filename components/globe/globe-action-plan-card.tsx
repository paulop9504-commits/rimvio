"use client";

/**
 * Action Plan card — L1 steps preview (Cursor-like plan, no jargon).
 */

import { useEffect, useState } from "react";
import {
  clearActionPlanUi,
  readActionPlanUi,
  subscribeActionPlanUi,
} from "@/lib/action-planner/action-plan-ui-store";
import type { ActionPlanV1 } from "@/lib/action-planner/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeActionPlanCardProps = {
  className?: string;
  onOpenApprovals?: () => void;
};

export function GlobeActionPlanCard({
  className,
  onOpenApprovals,
}: GlobeActionPlanCardProps) {
  const [plan, setPlan] = useState<ActionPlanV1 | null>(() =>
    readActionPlanUi(),
  );

  useEffect(() => {
    return subscribeActionPlanUi(() => {
      setPlan(readActionPlanUi());
    });
  }, []);

  if (!plan) {
    return null;
  }

  return (
    <section
      className={cn(
        "pointer-events-auto w-[min(100%,20rem)] space-y-2 rounded-2xl bg-white/96 px-3.5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.04]",
        className,
      )}
      data-globe-action-plan-card
      aria-label={copy.globe.actionPlanPreviewTitle}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b95a1]">
            Plan
          </p>
          <h3 className="text-[15px] font-bold tracking-tight text-[#191f28]">
            {copy.globe.actionPlanPreviewTitle}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => clearActionPlanUi()}
          className="rounded-full px-2 py-1 text-[11px] font-semibold text-[#8b95a1] hover:bg-black/[0.04]"
          aria-label={copy.globe.placeActionGraphCloseAria}
        >
          ✕
        </button>
      </header>
      <ol className="space-y-1.5">
        {plan.steps.map((step, index) => (
          <li
            key={step.id}
            className="flex items-start gap-2 text-[12px] tracking-tight text-[#191f28]"
            data-action-plan-step={step.id}
            data-status={step.status}
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[10px] font-semibold text-[#8b95a1]">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{step.labelKo}</span>
              {step.status === "done" ? (
                <span className="ml-1 text-[#34c759]">✓</span>
              ) : null}
              {step.noteKo ? (
                <span className="mt-0.5 block text-[10px] text-[#8b95a1]">
                  {step.noteKo}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-[#515154]">
        {copy.globe.actionPlanWaitingCommit}
      </p>
      {onOpenApprovals ? (
        <button
          type="button"
          onClick={onOpenApprovals}
          className="w-full rounded-xl bg-[#1d1d1f] px-3 py-2 text-[12px] font-semibold text-white"
        >
          {copy.globe.field.dashboardTabQueue}
        </button>
      ) : null}
    </section>
  );
}
