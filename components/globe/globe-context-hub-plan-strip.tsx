"use client";

import { useCallback, useState } from "react";
import { copy } from "@/lib/copy/human-ko";
import {
  buildContextHubPlanPreviewRows,
  formatContextExecutionPlanCurrentStepKo,
  needsContextExecutionAnyApproval,
  needsContextExecutionPlanApproval,
  needsContextExecutionStepApproval,
  type ContextExecutionPlanV1,
} from "@/lib/context-execution";
import { cn } from "@/lib/utils";

export type GlobeContextHubPlanStripProps = {
  plan: ContextExecutionPlanV1;
  /** MEANING why-line — e.g. "민수 = 제주". */
  meaningWhyLine?: string | null;
  compact?: boolean;
  className?: string;
  onApprove?: () => void | Promise<void>;
};

function stepStatusClass(status: ContextExecutionPlanV1["steps"][number]["status"]): string {
  switch (status) {
    case "done":
    case "prepared":
      return "text-[#34c759]";
    case "running":
      return "text-[#0071e3] font-semibold";
    case "blocked":
      return "text-[#ff3b30]";
    case "waiting_approval":
      return "text-[#ff9500]";
    default:
      return "text-[#3a3a3c]";
  }
}

/** Forward-looking Execution Plan preview — plan gate + step approval loop. */
export function GlobeContextHubPlanStrip({
  plan,
  meaningWhyLine = null,
  compact = false,
  className,
  onApprove,
}: GlobeContextHubPlanStripProps) {
  const [busy, setBusy] = useState(false);
  const rows = buildContextHubPlanPreviewRows(plan, compact ? 4 : 6);
  const currentLabel = formatContextExecutionPlanCurrentStepKo(plan);
  const planGate = needsContextExecutionPlanApproval(plan);
  const stepGate = needsContextExecutionStepApproval(plan);
  const showApproval = needsContextExecutionAnyApproval(plan) && Boolean(onApprove);
  const why = meaningWhyLine?.trim() || null;

  const handleApprove = useCallback(async () => {
    if (!onApprove || busy) {
      return;
    }
    setBusy(true);
    try {
      await onApprove();
    } finally {
      setBusy(false);
    }
  }, [busy, onApprove]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-black/[0.05]",
        className,
      )}
      data-globe-context-hub-plan-strip
      data-plan-phase={plan.osPhase}
      data-plan-approval={plan.approval}
      data-plan-step-gate={stepGate ? "true" : "false"}
      data-plan-meaning-why={why ? "true" : "false"}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">
          {copy.globe.executionPlanPreview.title}
        </p>
        {currentLabel && !showApproval ? (
          <p className="truncate text-[10px] font-medium text-[#0071e3]">
            {copy.globe.executionPlanPreview.currentStep(currentLabel)}
          </p>
        ) : null}
      </div>
      {why ? (
        <p
          className="mt-1 truncate text-[12px] font-semibold tracking-tight text-[#1d1d1f]"
          data-plan-meaning-why-line
        >
          <span className="font-medium text-[#8e8e93]">
            {copy.globe.executionPlanPreview.meaningWhyPrefix}
          </span>{" "}
          {why}
        </p>
      ) : null}
      {showApproval ? (
        <p className="mt-1 text-[11px] leading-snug text-[#636366]">
          {planGate
            ? copy.globe.executionPlanPreview.approvalHint
            : copy.globe.executionPlanPreview.stepApprovalHint}
        </p>
      ) : null}
      <ul className={cn("space-y-1", why || showApproval ? "mt-1.5" : compact ? "mt-1" : "mt-1.5")}>
        {rows.map((row) => (
          <li
            key={row.stepId}
            className={cn(
              "flex items-center gap-2 leading-snug",
              compact ? "text-[11px]" : "text-[12px]",
              stepStatusClass(row.status),
              row.isCurrent && !showApproval && "rounded-lg bg-[#0071e3]/[0.06] px-1.5 py-0.5",
            )}
            data-plan-step={row.stepId}
            data-plan-step-status={row.status}
            data-plan-step-current={row.isCurrent ? "true" : "false"}
          >
            <span className="w-3 shrink-0 text-center font-medium" aria-hidden>
              {row.symbol}
            </span>
            <span className="w-4 shrink-0 tabular-nums text-[#8e8e93]">{row.order}.</span>
            <span className="min-w-0 truncate">{row.labelKo}</span>
          </li>
        ))}
      </ul>
      {plan.steps.length > rows.length ? (
        <p className="mt-1 text-[10px] text-[#8e8e93]">
          {copy.globe.executionPlanPreview.moreSteps(plan.steps.length - rows.length)}
        </p>
      ) : null}
      {showApproval ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleApprove()}
          className="mt-2.5 w-full rounded-xl bg-[#0071e3] px-3 py-2 text-[12px] font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60"
          data-plan-approve-cta={planGate ? "plan" : "step"}
        >
          {busy
            ? "…"
            : planGate
              ? copy.globe.executionPlanPreview.approveCta
              : copy.globe.executionPlanPreview.stepApproveCta}
        </button>
      ) : null}
    </div>
  );
}
