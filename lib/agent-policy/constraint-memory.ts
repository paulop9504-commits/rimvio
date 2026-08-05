/**
 * Law 15 — Never Lose User Constraint.
 * Constraint bag survives replace / re-scout on the same Context.
 */

import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";

export type ConstraintMemoryBag = {
  readonly maxNightlyPriceKrw: number | null;
  readonly maxPriceBand: number | null;
  readonly nearLabelKo: string | null;
  readonly stayType: string | null;
  readonly minRating: number | null;
  readonly updatedAtIso: string;
};

export function emptyConstraintMemory(): ConstraintMemoryBag {
  return {
    maxNightlyPriceKrw: null,
    maxPriceBand: null,
    nearLabelKo: null,
    stayType: null,
    minRating: null,
    updatedAtIso: new Date(0).toISOString(),
  };
}

const NEAR_LABEL_RE =
  /([가-힣A-Za-z0-9]{2,16})(?:역)?\s*(?:쪽|근처|중심|주변|앞으로)/u;

export function extractNearLabelKo(utterance: string): string | null {
  const text = utterance.trim();
  if (!text) return null;
  const m = text.match(NEAR_LABEL_RE);
  const raw = m?.[1]?.trim();
  if (!raw) return null;
  if (/호텔|숙소|찾아|다시|더|싼|가격|예약/u.test(raw)) return null;
  return raw;
}

export function mergeConstraintMemoryFromUtterance(input: {
  readonly prev: ConstraintMemoryBag | null | undefined;
  readonly utterance: string;
}): ConstraintMemoryBag {
  const base = input.prev ?? emptyConstraintMemory();
  const text = input.utterance.trim();
  if (!text) return base;

  const hardPrice = parseMaxNightlyPriceKrw(text);
  const stayType = parseLodgingStayTypeFromText(text);
  const near = extractNearLabelKo(text);
  let minRating: number | null = null;
  if (/평점|별점|rating/iu.test(text)) {
    const m = text.match(/(\d+(?:\.\d+)?)/);
    minRating = m?.[1] ? Number(m[1]) : 4.5;
  }
  const softBudget = /더\s*싸|저렴|가성비|budget|cheap/iu.test(text);

  return {
    maxNightlyPriceKrw:
      hardPrice != null ? hardPrice : base.maxNightlyPriceKrw,
    maxPriceBand:
      softBudget || hardPrice != null
        ? hardPrice != null && hardPrice <= 80_000
          ? 2
          : softBudget
            ? 2
            : base.maxPriceBand
        : base.maxPriceBand,
    nearLabelKo: near ?? base.nearLabelKo,
    stayType: stayType ?? base.stayType,
    minRating: minRating ?? base.minRating,
    updatedAtIso: new Date().toISOString(),
  };
}

/** Append remembered constraints onto a scout query (Law 15). */
export function applyConstraintMemoryToScoutQuery(
  utterance: string,
  bag: ConstraintMemoryBag | null | undefined,
): string {
  const base = utterance.trim();
  if (!bag) return base;
  const bits: string[] = [];
  if (bag.nearLabelKo) bits.push(`${bag.nearLabelKo} 근처`);
  if (bag.stayType) bits.push(bag.stayType);
  if (bag.maxNightlyPriceKrw != null) {
    bits.push(`1박 ${Math.round(bag.maxNightlyPriceKrw / 10_000)}만원대`);
  } else if (bag.maxPriceBand != null && bag.maxPriceBand <= 2) {
    bits.push("저렴");
  }
  if (bag.minRating != null) bits.push(`평점 ${bag.minRating}+`);
  if (bits.length === 0) return base;
  // Avoid duplicating tokens already in utterance.
  const extra = bits.filter((b) => !base.includes(b.replace(/\s+/g, "")));
  if (extra.length === 0) return base;
  return `${base} ${extra.join(" ")}`.trim();
}

export function constraintMemoryLinesKo(
  bag: ConstraintMemoryBag | null | undefined,
): string[] {
  if (!bag) return [];
  const lines: string[] = [];
  if (bag.nearLabelKo) lines.push(`위치 · ${bag.nearLabelKo}`);
  if (bag.maxNightlyPriceKrw != null) {
    lines.push(
      `예산 · 1박 ${bag.maxNightlyPriceKrw.toLocaleString("ko-KR")}원 이하`,
    );
  } else if (bag.maxPriceBand != null && bag.maxPriceBand <= 2) {
    lines.push("예산 · 저렴 선호");
  }
  if (bag.stayType) lines.push(`숙소 타입 · ${bag.stayType}`);
  if (bag.minRating != null) lines.push(`평점 · ${bag.minRating}+`);
  return lines.slice(0, 4);
}
