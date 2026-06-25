"use client";

import { useMemo, useState } from "react";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import {
  findMarketPreferenceMemory,
  recordMarketPreferenceSignal,
  resolveMarketQuestionPlan,
} from "@/lib/globe/market/preference-memory";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import { patchMarketDraftPrioritySlot } from "@/lib/globe/market/patch-market-draft-priority-slot";
import { copy } from "@/lib/copy/human-ko";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type MarketDynamicQuestionFieldsProps = {
  draft: MarketIntentDraft;
  onPatch: (updater: (prev: MarketIntentDraft) => MarketIntentDraft) => void;
  className?: string;
  emptyFallback?: string;
};

export function MarketDynamicQuestionFields({
  draft,
  onPatch,
  className,
  emptyFallback,
}: MarketDynamicQuestionFieldsProps) {
  const [dismissedConfirmIds, setDismissedConfirmIds] = useState<string[]>([]);

  const plan = useMemo(
    () =>
      resolveMarketQuestionPlan({
        text: draft.detail.sourceText || draft.title,
        productName: draft.detail.productName || draft.title,
        categoryId: draft.categoryId,
        role: draft.role,
        existingDetail: draft.detail,
        priceMinKrw: draft.priceMinKrw,
        priceMaxKrw: draft.priceMaxKrw,
      }),
    [
      draft.categoryId,
      draft.detail,
      draft.priceMaxKrw,
      draft.priceMinKrw,
      draft.role,
      draft.title,
    ],
  );

  const confirmations = plan.confirmations.filter(
    (item) => !dismissedConfirmIds.includes(item.memoryId),
  );

  if (confirmations.length === 0 && plan.questions.length === 0) {
    if (emptyFallback) {
      return (
        <p className={cn(RIMVIO_TYPE.caption, className)}>{emptyFallback}</p>
      );
    }
    return null;
  }

  const applyWithMemory = (
    slotId: MarketPrioritySlotId,
    factorKey: string,
    value: string | number | boolean,
    kind: "save_answer" | "confirm_apply",
  ) => {
    try {
      recordMarketPreferenceSignal({
        categorySlug: plan.category,
        categoryId: plan.categoryId,
        role: draft.role,
        slotId,
        factorKey,
        value,
        kind,
      });
    } catch {
      // preference memory is best-effort — slot still applies
    }
    onPatch((prev) => patchMarketDraftPrioritySlot(prev, slotId, value));
  };

  return (
    <div className={cn("mt-5 space-y-4", className)} data-market-question-engine>
      <div>
        <p className={cn(RIMVIO_TYPE.caption, "text-primary")}>
          {copy.globe.marketQuestionEngineEyebrow}
        </p>
        <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>
          {confirmations.length > 0
            ? copy.globe.marketPreferenceConfirmFirstBody
            : copy.globe.marketQuestionEngineBody}
        </p>
      </div>

      {confirmations.map((item) => (
        <div
          key={item.memoryId}
          className="rounded-2xl bg-[#f0f6ff] px-3.5 py-3.5 ring-1 ring-[#3182f6]/15"
          data-market-preference-confirm={item.slotId}
        >
          <p className="whitespace-pre-line text-[14px] font-semibold leading-relaxed text-[#191f28]">
            {item.confirmPromptKo}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-[#3182f6] px-4 py-2 text-[13px] font-semibold text-white active:scale-[0.98]"
              onClick={() => {
                applyWithMemory(item.slotId, item.key, item.value, "confirm_apply");
                setDismissedConfirmIds((prev) => [...prev, item.memoryId]);
              }}
            >
              {copy.globe.marketPreferenceConfirmApply}
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#4e5968] ring-1 ring-black/[0.08] active:scale-[0.98]"
              onClick={() => {
                recordMarketPreferenceSignal({
                  categorySlug: plan.category,
                  categoryId: plan.categoryId,
                  role: draft.role,
                  slotId: item.slotId,
                  factorKey: item.key,
                  value: item.value,
                  kind: "confirm_reject",
                });
                setDismissedConfirmIds((prev) => [...prev, item.memoryId]);
              }}
            >
              {copy.globe.marketPreferenceConfirmChange}
            </button>
          </div>
        </div>
      ))}

      {plan.questions.map((factor) => (
        <div
          key={factor.key}
          className="rounded-2xl bg-muted/35 px-3.5 py-3 ring-1 ring-black/[0.04]"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold leading-snug text-foreground">
              {factor.question}
            </p>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
              {Math.round(factor.importance * 100)}
            </span>
          </div>
          {factor.hintKo ? (
            <p className="mt-1 text-[12px] text-[#6b7684]">{factor.hintKo}</p>
          ) : null}
          <FactorQuickReplies
            slotId={factor.slotId}
            role={draft.role}
            value={draft.detail.prioritySlots[factor.slotId]}
            onPick={(value) =>
              applyWithMemory(factor.slotId, factor.key, value, "save_answer")
            }
            onSkip={() => {
              const memory = findMarketPreferenceMemory({
                categorySlug: plan.category,
                categoryId: plan.categoryId,
                role: draft.role,
                slotId: factor.slotId,
              });
              if (!memory) {
                return;
              }
              recordMarketPreferenceSignal({
                categorySlug: plan.category,
                categoryId: plan.categoryId,
                role: draft.role,
                slotId: factor.slotId,
                factorKey: factor.key,
                value: memory.value,
                kind: "skip_question",
              });
            }}
          />
        </div>
      ))}
    </div>
  );
}

function FactorQuickReplies({
  slotId,
  role,
  value,
  onPick,
  onSkip,
}: {
  slotId: MarketPrioritySlotId;
  role: MarketIntentDraft["role"];
  value: string | number | boolean | null | undefined;
  onPick: (value: string | number | boolean) => void;
  onSkip?: () => void;
}) {
  const chips = chipsForSlot(slotId, role);
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onPick(chip.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === chip.value
              ? "bg-primary text-primary-foreground"
              : "bg-background/80 text-foreground ring-1 ring-black/[0.06]",
          )}
        >
          {chip.label}
        </button>
      ))}
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#8b95a1] underline-offset-2 hover:underline"
        >
          {copy.globe.marketPreferenceSkipQuestion}
        </button>
      ) : null}
    </div>
  );
}

function chipsForSlot(
  slotId: MarketPrioritySlotId,
  role: MarketIntentDraft["role"],
): Array<{ label: string; value: string | number | boolean }> {
  switch (slotId) {
    case "battery_health":
      return [
        { label: "80%+", value: 80 },
        { label: "85%+", value: 85 },
        { label: "90%+", value: 90 },
        { label: "95%+", value: 95 },
      ];
    case "storage_gb":
      return [
        { label: "128GB", value: 128 },
        { label: "256GB", value: 256 },
        { label: "512GB", value: 512 },
        { label: "1TB", value: 1024 },
      ];
    case "cosmetic_grade":
      return [
        { label: "미개봉", value: "sealed" },
        { label: "거의 새것", value: "like_new" },
        { label: "사용감 적음", value: "good" },
      ];
    case "condition_abc":
      return [
        { label: "A", value: "A" },
        { label: "B", value: "B" },
        { label: "C", value: "C" },
      ];
    case "repair_history":
      return role === "seeking"
        ? [
            { label: "수리 없음", value: true },
            { label: "상관없음", value: "any" },
          ]
        : [
            { label: "없음", value: true },
            { label: "있음", value: false },
          ];
    case "price":
      return [
        { label: "50만", value: 500_000 },
        { label: "70만", value: 700_000 },
        { label: "100만", value: 1_000_000 },
      ];
    case "model_year":
      return [
        { label: "1년 이내", value: "1년 이내" },
        { label: "2년 이내", value: "2년 이내" },
        { label: "상관없음", value: "any" },
      ];
    case "working_state":
      return [
        { label: "5만km 이하", value: "5만km 이하" },
        { label: "10만km 이하", value: "10만km 이하" },
        { label: "정상 작동", value: "정상 작동" },
      ];
    default:
      return [];
  }
}
