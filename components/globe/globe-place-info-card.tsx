"use client";

/**
 * Info surface — structured place facts + actions (L1).
 * Ontology stays internal; user sees 예약 · 전화 · 혼잡 · 가격 only.
 * CTAs gated by Reality Object execution capabilities when provided.
 */

import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import {
  gatePlaceInfoActionsByCapabilities,
  type RealityExecutionCapability,
} from "@/lib/reality-object";

export type PlaceInfoFact = {
  readonly id: string;
  readonly labelKo: string;
};

export type PlaceInfoReason = {
  readonly id: string;
  readonly labelKo: string;
};

export type GlobePlaceInfoCardProps = {
  title: string;
  ratingLabel?: string | null;
  facts: readonly PlaceInfoFact[];
  reasons: readonly PlaceInfoReason[];
  /** When set, only capabilities that match are shown. */
  executionCapabilities?: readonly RealityExecutionCapability[] | null;
  onCall?: (() => void) | null;
  onDirections?: (() => void) | null;
  onReservePrep?: (() => void) | null;
  onBookNow?: (() => void) | null;
  onAddToExecutionInbox?: (() => void) | null;
  className?: string;
};

export function GlobePlaceInfoCard({
  title,
  ratingLabel,
  facts,
  reasons,
  executionCapabilities,
  onCall,
  onDirections,
  onReservePrep,
  onBookNow,
  onAddToExecutionInbox,
  className,
}: GlobePlaceInfoCardProps) {
  const gated = executionCapabilities?.length
    ? gatePlaceInfoActionsByCapabilities({
        capabilities: executionCapabilities,
        handlers: {
          onCall,
          onDirections,
          onReservePrep,
          onBookNow,
          onAddToExecutionInbox,
        },
      })
    : {
        onCall,
        onDirections,
        onReservePrep,
        onBookNow,
        onAddToExecutionInbox,
      };

  return (
    <section
      className={cn(
        "space-y-3 rounded-2xl bg-white px-3.5 py-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]",
        className,
      )}
      data-globe-place-info-card
      aria-label="Info"
    >
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b95a1]">
          Info
        </p>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[17px] font-bold tracking-tight text-[#191f28]">
            {title}
          </h3>
          {ratingLabel ? (
            <span className="shrink-0 text-[13px] font-semibold text-[#191f28]">
              {ratingLabel}
            </span>
          ) : null}
        </div>
      </header>

      {facts.length > 0 ? (
        <ul className="space-y-1 border-b border-black/[0.05] pb-3">
          {facts.map((fact) => (
            <li
              key={fact.id}
              className="text-[13px] tracking-tight text-[#515154]"
              data-place-info-fact={fact.id}
            >
              {fact.labelKo}
            </li>
          ))}
        </ul>
      ) : null}

      {reasons.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-[#1d1d1f]">
            {copy.globe.intelligentPinAiInsightPrefix}
          </p>
          <ul className="space-y-1">
            {reasons.map((reason) => (
              <li
                key={reason.id}
                className="flex items-start gap-1.5 text-[13px] tracking-tight text-[#191f28]"
                data-place-info-reason={reason.id}
              >
                <span className="text-emerald-600" aria-hidden>
                  ✔
                </span>
                <span>{reason.labelKo}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5 pt-1" data-place-info-actions>
        {gated.onCall ? (
          <button
            type="button"
            onClick={gated.onCall}
            className="rounded-full bg-[#f5f5f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.04]"
          >
            {copy.globe.intelligentPinCallCta}
          </button>
        ) : null}
        {gated.onDirections ? (
          <button
            type="button"
            onClick={gated.onDirections}
            className="rounded-full bg-[#f5f5f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.04]"
          >
            {copy.globe.intelligentPinDirectionsCta}
          </button>
        ) : null}
        {gated.onReservePrep ? (
          <button
            type="button"
            onClick={gated.onReservePrep}
            className="rounded-full bg-[#f5f5f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.04]"
          >
            {copy.globe.intelligentPinReservePrepCta}
          </button>
        ) : null}
        {gated.onBookNow ? (
          <button
            type="button"
            onClick={gated.onBookNow}
            className="rounded-full bg-[#0071e3] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
          >
            {copy.globe.intelligentPinBookNowCta}
          </button>
        ) : null}
        {gated.onAddToExecutionInbox ? (
          <button
            type="button"
            onClick={gated.onAddToExecutionInbox}
            className="rounded-full bg-[#191f28] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
            data-place-info-add-inbox
          >
            {copy.globe.intelligentPinAddInboxCta}
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** Derive Info facts/reasons from feed secondary + detail lines. */
export function buildPlaceInfoFromFeedLines(input: {
  secondaryLine?: string | null;
  detailReasonLine?: string | null;
  openHoursLabel?: string | null;
  waitMinutes?: number | null;
  reservable?: boolean;
  payable?: boolean;
}): {
  facts: PlaceInfoFact[];
  reasons: PlaceInfoReason[];
} {
  const facts: PlaceInfoFact[] = [];
  if (input.openHoursLabel?.trim()) {
    facts.push({
      id: "hours",
      labelKo: copy.globe.intelligentPinOpenNowHours(input.openHoursLabel.trim()),
    });
  }
  if (input.waitMinutes != null && Number.isFinite(input.waitMinutes)) {
    facts.push({
      id: "wait",
      labelKo: copy.globe.intelligentPinAvgWait(Math.round(input.waitMinutes)),
    });
  }
  if (input.reservable) {
    facts.push({ id: "reservable", labelKo: copy.globe.intelligentPinReservable });
  }
  if (input.payable) {
    facts.push({ id: "payable", labelKo: copy.globe.intelligentPinPayable });
  }
  if (facts.length === 0 && input.secondaryLine?.trim()) {
    facts.push({ id: "secondary", labelKo: input.secondaryLine.trim() });
  }

  const reasons = (input.detailReasonLine ?? "")
    .split(/[·|,]/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((labelKo, index) => ({ id: `r${index}`, labelKo }));

  return { facts, reasons };
}
