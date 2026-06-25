"use client";

import { useMemo } from "react";
import { MarketDynamicQuestionFields } from "@/components/market/market-dynamic-question-fields";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import {
  getWeightedPrioritySlots,
  marketPrioritySlotLabelKo,
} from "@/lib/globe/market/market-priority-matrix";
import { readMarketSlotImportanceWeights } from "@/lib/globe/market/preference-memory/market-slot-importance";
import { resolveMarketQuestionPlan } from "@/lib/globe/market/preference-memory";
import { resolveMarketQuestionProfile } from "@/lib/globe/market/question-engine/resolve-market-question-category";
import { copy } from "@/lib/copy/human-ko";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type MarketPriorityStepSurfaceProps = {
  draft: MarketIntentDraft;
  onChange: (draft: MarketIntentDraft) => void;
  className?: string;
};

function blendImportance(matrixWeight: number, learned?: number): number {
  if (typeof learned !== "number") {
    return matrixWeight;
  }
  return Math.round((matrixWeight * 0.45 + learned * 0.55) * 100) / 100;
}

export function MarketPriorityStepSurface({
  draft,
  onChange,
  className,
}: MarketPriorityStepSurfaceProps) {
  const profile = useMemo(
    () =>
      resolveMarketQuestionProfile({
        text: draft.detail.sourceText || draft.title,
        productName: draft.detail.productName || draft.title,
        categoryId: draft.categoryId,
      }),
    [draft.categoryId, draft.detail.productName, draft.detail.sourceText, draft.title],
  );

  const learnedWeights = useMemo(
    () =>
      readMarketSlotImportanceWeights({
        categorySlug: profile.slug,
        role: draft.role,
      }),
    [draft.role, profile.slug],
  );

  const rankedSlots = useMemo(() => {
    const matrixSlots = getWeightedPrioritySlots(draft.categoryId);
    return [...matrixSlots]
      .map((slot) => ({
        field: slot.field,
        labelKo: marketPrioritySlotLabelKo(slot.field),
        importance: blendImportance(slot.weight, learnedWeights[slot.field]),
        filled:
          draft.detail.prioritySlots[slot.field] !== undefined &&
          draft.detail.prioritySlots[slot.field] !== null &&
          draft.detail.prioritySlots[slot.field] !== "",
      }))
      .sort((a, b) => b.importance - a.importance);
  }, [draft.categoryId, draft.detail.prioritySlots, learnedWeights]);

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

  const isSeeking = draft.role === "seeking";

  return (
    <div className={cn("space-y-4", className)} data-market-priority-step>
      <div>
        <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>
          {isSeeking
            ? copy.globe.marketWizardPriorityTitleSeeking
            : copy.globe.marketWizardPriorityTitleListing}
        </p>
        <p className={cn("mt-1", RIMVIO_TYPE.caption)}>
          {copy.globe.marketWizardPriorityBody}
        </p>
      </div>

      <div className="rounded-2xl bg-muted/35 p-3 ring-1 ring-black/[0.04]">
        <p className={cn(RIMVIO_TYPE.caption, "text-primary")}>
          {copy.globe.marketWizardPriorityRankEyebrow}
        </p>
        <ul className="mt-2 space-y-2">
          {rankedSlots.slice(0, 4).map((slot) => (
            <li key={slot.field} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[12px] font-medium text-foreground">
                {slot.labelKo}
              </span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round(slot.importance * 100)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {Math.round(slot.importance * 100)}
              </span>
              {slot.filled ? (
                <span className="text-[11px] font-medium text-primary">✓</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <MarketDynamicQuestionFields
        draft={draft}
        onChange={onChange}
        emptyFallback={
          plan.confirmations.length === 0 && plan.questions.length === 0
            ? copy.globe.marketWizardPriorityCompleteHint
            : undefined
        }
      />
    </div>
  );
}
