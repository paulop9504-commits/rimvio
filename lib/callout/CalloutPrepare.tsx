"use client";

import { Check } from "lucide-react";
import type { CalloutViewModel } from "@/lib/callout/types";
import { cn } from "@/lib/utils";

export function CalloutPrepare({
  model,
  onCreateDraft,
  onHandoffCommit,
  className,
}: {
  model: CalloutViewModel["prepare"];
  onCreateDraft?: () => void;
  /** Separate Reality Action — never part of Prepare */
  onHandoffCommit?: () => void;
  className?: string;
}) {
  const draft = model.draft;

  return (
    <div className={cn("space-y-3", className)} data-callout-mode="prepare">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.04em] text-[#8b95a1]">
          Prepare
        </p>
        <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[10px] font-semibold text-[#8b95a1]">
          Draft only
        </span>
      </div>

      <p className="text-[12px] font-semibold text-[#191f28]">{model.titleKo}</p>

      <ul className="space-y-1.5">
        {model.steps.map((step) => (
          <li
            key={step.id}
            className={cn(
              "flex items-start gap-2 rounded-[12px] px-2.5 py-2 text-[12px] font-medium",
              step.done
                ? "bg-white text-[#191f28] ring-1 ring-black/[0.04]"
                : "bg-[#f2f4f6] text-[#8b95a1]",
            )}
          >
            {step.done ? (
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22c55e]"
                strokeWidth={2.8}
              />
            ) : (
              <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-[#d1d6db] text-[9px]">
                ○
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block">{step.labelKo}</span>
              {step.detailKo ? (
                <span className="mt-0.5 block text-[11px] font-medium text-[#8b95a1]">
                  {step.detailKo}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {draft ? (
        <div className="rounded-[14px] bg-white px-3 py-2.5 ring-1 ring-black/[0.04]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-[#8b95a1]">
              ReservationDraft
            </p>
            <span className="rounded-full bg-[#e8f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#3182f6]">
              {draft.status}
            </span>
          </div>
          <dl className="mt-2 space-y-1 text-[12px]">
            <div className="flex justify-between gap-2">
              <dt className="text-[#8b95a1]">날짜</dt>
              <dd className="font-semibold text-[#191f28]">
                {draft.dateRange.labelKo ?? "미정"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#8b95a1]">인원</dt>
              <dd className="font-semibold tabular-nums text-[#191f28]">
                {draft.guestCount}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#8b95a1]">가격</dt>
              <dd className="font-semibold text-[#191f28]">
                {draft.price.labelKo ?? "미정"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!model.canCreateDraft}
        className={cn(
          "w-full rounded-full px-3 py-2.5 text-[12px] font-semibold",
          model.canCreateDraft
            ? "bg-[#3182f6] text-white"
            : "cursor-not-allowed bg-[#e8ebef] text-[#c4c9d0]",
        )}
        onClick={() => {
          if (model.canCreateDraft) onCreateDraft?.();
        }}
      >
        {model.ctaKo}
      </button>

      {onHandoffCommit ? (
        <button
          type="button"
          className="w-full rounded-full bg-[#191f28] px-3 py-2 text-[11px] font-semibold text-white"
          onClick={onHandoffCommit}
        >
          Commit은 Field에서
        </button>
      ) : null}

      <p className="text-center text-[10px] text-[#8b95a1]">
        {model.commitHintKo}
      </p>
    </div>
  );
}
