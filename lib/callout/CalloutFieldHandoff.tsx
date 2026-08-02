"use client";

/**
 * Field Reality Commit CTA — visible from Callout Prepare, executes only via Field handoff.
 * Callout itself never Commits.
 */

import { FIELD_REALITY_COMMIT_STAGES } from "@/lib/callout/commit-boundary";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = {
  field_action: "Field Action",
  reality_transaction: "Transaction",
  user_approval: "Approval",
  commit_ledger: "Ledger",
};

export function CalloutFieldHandoff({
  summaryKo,
  ctaKo,
  enabled,
  onFieldAction,
  className,
}: {
  summaryKo: string;
  ctaKo: string;
  enabled: boolean;
  onFieldAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-2.5", className)}
      data-reality-commit-boundary
      data-callout-commit-forbidden
    >
      <p className="text-[11px] font-semibold tracking-[0.04em] text-[#8b95a1]">
        Reality Commit Boundary
      </p>
      <ol className="flex flex-wrap items-center gap-1">
        {FIELD_REALITY_COMMIT_STAGES.map((stage, i) => (
          <li key={stage} className="flex items-center gap-1">
            {i > 0 ? (
              <span className="text-[9px] text-[#d1d6db]" aria-hidden>
                →
              </span>
            ) : null}
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#8b95a1] ring-1 ring-black/[0.04]">
              {STAGE_LABEL[stage] ?? stage}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[12px] leading-snug text-[#4e5968]">{summaryKo}</p>
      <button
        type="button"
        disabled={!enabled}
        className={cn(
          "w-full rounded-full px-3 py-2.5 text-[12px] font-semibold",
          enabled
            ? "bg-[#191f28] text-white"
            : "cursor-not-allowed bg-[#e8ebef] text-[#c4c9d0]",
        )}
        onClick={() => onFieldAction?.()}
        data-field-action="confirm_reservation"
      >
        {ctaKo}
      </button>
      <p className="text-center text-[10px] text-[#8b95a1]">
        Callout Commit 불가 · Field에서만 실행
      </p>
    </div>
  );
}
