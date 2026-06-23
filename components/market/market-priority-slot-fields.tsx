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
import { MarketVolumeZoneInsight } from "@/components/market/market-volume-zone-insight";
import { copy } from "@/lib/copy/human-ko";
import { rimvioComposerFieldClass } from "@/lib/brand/rimvio-neon-theme";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

const ABC_GRADES = ["A", "B", "C"] as const;
const COSMETIC_GRADES = ["like_new", "good", "fair"] as const;

function manToKrw(value: string): number | null {
  const trimmed = value.replace(/\D/g, "");
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed * 10_000;
}

function NumericUnitField({
  value,
  onChange,
  suffix,
  placeholder,
  inputMode = "numeric",
}: {
  value: string;
  onChange: (next: string) => void;
  suffix: string;
  placeholder: string;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <div className="relative">
      <input
        inputMode={inputMode}
        className={cn(rimvioComposerFieldClass, "w-full py-2.5 pl-3 pr-[3.25rem]")}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
      />
      <span
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[14px] font-medium text-muted-foreground"
        aria-hidden
      >
        {suffix}
      </span>
    </div>
  );
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
          autoComplete="off"
          spellCheck={false}
        />
        <p className={cn("mt-1.5", RIMVIO_TYPE.caption)}>
          {copy.globe.marketWizardProductNameHint}
        </p>
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
              <NumericUnitField
                value={man}
                suffix="만원"
                placeholder="80"
                onChange={(digits) => {
                  const krw = manToKrw(digits);
                  const prioritySlots = { ...draft.detail.prioritySlots, price: krw };
                  onChange({
                    ...draft,
                    priceMinKrw: krw,
                    priceMaxKrw: krw,
                    detail: { ...draft.detail, prioritySlots },
                  });
                }}
              />
            </label>
          );
        }

        if (slot.kind === "percent") {
          const percentValue =
            value !== undefined && value !== null ? String(value).replace(/\D/g, "") : "";
          return (
            <label key={field} className="block">
              <span className={cn(RIMVIO_TYPE.caption, "mb-1 block font-medium text-foreground")}>
                {label}
              </span>
              <NumericUnitField
                value={percentValue}
                suffix="%"
                placeholder="85"
                onChange={(digits) => {
                  const parsed = digits ? Number.parseInt(digits, 10) : null;
                  patchSlot(field, Number.isFinite(parsed) ? parsed : null);
                }}
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

      <MarketVolumeZoneInsight draft={draft} />
    </div>
  );
}
