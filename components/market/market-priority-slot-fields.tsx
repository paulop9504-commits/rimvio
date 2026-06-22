"use client";

import type { ReactNode } from "react";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import {
  getCategoryPriorityMatrix,
  getTopPrioritySlots,
  marketPrioritySlotLabelKo,
  marketPrioritySlotPlaceholderKo,
  type MarketPrioritySlotId,
} from "@/lib/globe/market/market-priority-matrix";
import { marketListingConditionLabelKo } from "@/lib/globe/market/market-intent-detail";
import { copy } from "@/lib/copy/human-ko";
import { rimvioComposerFieldClass } from "@/lib/brand/rimvio-neon-theme";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

const ABC_GRADES = ["A", "B", "C"] as const;
const COSMETIC_GRADES = ["like_new", "good", "fair"] as const;

function manToKrw(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed.replace(/,/g, ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed * 10_000;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export type MarketPrioritySlotFieldsProps = {
  draft: MarketIntentDraft;
  onChange: (draft: MarketIntentDraft) => void;
};

export function MarketPrioritySlotFields({ draft, onChange }: MarketPrioritySlotFieldsProps) {
  const matrix = getCategoryPriorityMatrix(draft.categoryId);
  const topSlots = getTopPrioritySlots(draft.categoryId);
  const guide =
    draft.role === "seeking" ? matrix.seekerGuideKo : matrix.sellerGuideKo;

  const patchSlot = (field: MarketPrioritySlotId, value: string | number | boolean | null) => {
    const prioritySlots = { ...draft.detail.prioritySlots, [field]: value };
    const next: MarketIntentDraft = {
      ...draft,
      detail: { ...draft.detail, prioritySlots },
    };
    if (field === "price" && typeof value === "number") {
      next.priceMinKrw = value;
      next.priceMaxKrw = value;
    }
    if (field === "condition_abc" && typeof value === "string") {
      const map: Record<string, MarketIntentDraft["detail"]["conditionId"]> = {
        A: "like_new",
        B: "good",
        C: "fair",
      };
      next.detail.conditionId = map[value] ?? draft.detail.conditionId;
    }
    if (field === "cosmetic_grade" && typeof value === "string") {
      next.detail.conditionId = value as MarketIntentDraft["detail"]["conditionId"];
    }
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <p className={cn(RIMVIO_TYPE.caption, "rounded-xl bg-primary/5 px-3 py-2 text-[13px]")}>
        {copy.globe.marketPriorityCardEyebrow} · {guide}
      </p>

      <label className="block">
        <span className={cn(RIMVIO_TYPE.caption, "mb-1 block")}>
          {copy.globe.marketWizardProductNameLabel}
        </span>
        <input
          className={cn(rimvioComposerFieldClass, "w-full px-3 py-2.5 text-[15px]")}
          value={draft.detail.productName}
          onChange={(event) =>
            onChange({
              ...draft,
              title: event.target.value,
              detail: { ...draft.detail, productName: event.target.value },
            })
          }
          placeholder={copy.globe.marketWizardProductNamePlaceholder}
        />
      </label>

      {topSlots.map((slot) => {
        const field = slot.field;
        const label = marketPrioritySlotLabelKo(field);
        const value = draft.detail.prioritySlots[field];

        if (field === "price") {
          const man =
            draft.priceMinKrw !== null
              ? String(Math.round((draft.priceMinKrw ?? 0) / 10_000))
              : "";
          return (
            <label key={field} className="block">
              <span className={cn(RIMVIO_TYPE.caption, "mb-1 block font-medium text-foreground")}>
                {label}
              </span>
              <input
                inputMode="numeric"
                className={cn(rimvioComposerFieldClass, "w-full px-3 py-2.5")}
                value={man}
                onChange={(event) => {
                  const krw = manToKrw(event.target.value);
                  const prioritySlots = { ...draft.detail.prioritySlots, price: krw };
                  onChange({
                    ...draft,
                    priceMinKrw: krw,
                    priceMaxKrw: krw,
                    detail: { ...draft.detail, prioritySlots },
                  });
                }}
                placeholder={marketPrioritySlotPlaceholderKo(field, draft.role)}
              />
            </label>
          );
        }

        if (slot.kind === "percent") {
          return (
            <label key={field} className="block">
              <span className={cn(RIMVIO_TYPE.caption, "mb-1 block font-medium text-foreground")}>
                {label}
              </span>
              <input
                inputMode="numeric"
                className={cn(rimvioComposerFieldClass, "w-full px-3 py-2.5")}
                value={value !== undefined && value !== null ? String(value) : ""}
                onChange={(event) => patchSlot(field, event.target.value)}
                placeholder={marketPrioritySlotPlaceholderKo(field, draft.role)}
              />
            </label>
          );
        }

        if (slot.kind === "grade_abc") {
          return (
            <div key={field}>
              <span className={cn(RIMVIO_TYPE.caption, "mb-2 block font-medium text-foreground")}>
                {label}
              </span>
              <div className="flex gap-2">
                {ABC_GRADES.map((grade) => (
                  <Chip
                    key={grade}
                    active={value === grade}
                    onClick={() => patchSlot(field, grade)}
                  >
                    {grade}
                  </Chip>
                ))}
              </div>
            </div>
          );
        }

        if (slot.kind === "grade_cosmetic") {
          return (
            <div key={field}>
              <span className={cn(RIMVIO_TYPE.caption, "mb-2 block font-medium text-foreground")}>
                {label}
              </span>
              <div className="flex flex-wrap gap-2">
                {COSMETIC_GRADES.map((grade) => (
                  <Chip
                    key={grade}
                    active={value === grade || draft.detail.conditionId === grade}
                    onClick={() => patchSlot(field, grade)}
                  >
                    {marketListingConditionLabelKo(grade)}
                  </Chip>
                ))}
              </div>
            </div>
          );
        }

        if (slot.kind === "boolean_none") {
          return (
            <label key={field} className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={value === true}
                onChange={(event) => patchSlot(field, event.target.checked)}
              />
              {label}
            </label>
          );
        }

        if (field === "distance") {
          return (
            <div key={field}>
              <span className={cn(RIMVIO_TYPE.caption, "mb-1 block font-medium text-foreground")}>
                {label}
              </span>
              <p className="text-[14px] font-medium text-foreground">
                {draft.placeLabel || copy.globe.marketIntentPrefillHint} · {draft.radiusKm}km
              </p>
            </div>
          );
        }

        return (
          <label key={field} className="block">
            <span className={cn(RIMVIO_TYPE.caption, "mb-1 block font-medium text-foreground")}>
              {label}
            </span>
            <input
              className={cn(rimvioComposerFieldClass, "w-full px-3 py-2.5")}
              value={value !== undefined && value !== null ? String(value) : ""}
              onChange={(event) => patchSlot(field, event.target.value)}
              placeholder={marketPrioritySlotPlaceholderKo(field, draft.role)}
            />
          </label>
        );
      })}
    </div>
  );
}
