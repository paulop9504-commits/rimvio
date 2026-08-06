/**
 * Law 15 — Never Lose User Constraint.
 * Constraint bag survives replace / re-scout on the same Context.
 *
 * P1: NL → one structured ConstraintMemoryBag (SSOT for scout + soft refine).
 */

import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";
import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { isDestinationPivotUtterance } from "@/lib/agent-policy/constraint-inheritance-policy";

export type ConstraintSortBy = "price" | "rating" | "value";

export type ConstraintMemoryBag = {
  readonly maxNightlyPriceKrw: number | null;
  readonly maxPriceBand: number | null;
  /** Trip / city destination — survives soft follow-ups (「맛집」 alone). */
  readonly destinationKo: string | null;
  readonly nearLabelKo: string | null;
  readonly stayType: string | null;
  readonly minRating: number | null;
  /** Soft refine — keep only top N after scout / in-set rank. */
  readonly keepTopN: number | null;
  readonly sortBy: ConstraintSortBy | null;
  readonly updatedAtIso: string;
};

export function emptyConstraintMemory(): ConstraintMemoryBag {
  return {
    maxNightlyPriceKrw: null,
    maxPriceBand: null,
    destinationKo: null,
    nearLabelKo: null,
    stayType: null,
    minRating: null,
    keepTopN: null,
    sortBy: null,
    updatedAtIso: new Date(0).toISOString(),
  };
}

const NEAR_LABEL_RE =
  /([가-힣A-Za-z0-9]{2,16})(?:역)?\s*(?:쪽|근처|중심|주변|앞으로)/u;

export function extractNearLabelKo(utterance: string): string | null {
  const text = utterance.trim();
  if (!text) return null;
  const namedStation = text.match(/([가-힣A-Za-z0-9]+역)/u)?.[1]?.trim();
  if (namedStation && /근처|주변|앞|에서/u.test(text)) {
    return namedStation;
  }
  const m = text.match(NEAR_LABEL_RE);
  const raw = m?.[1]?.trim();
  if (!raw) return null;
  if (/호텔|숙소|찾아|다시|더|싼|가격|예약/u.test(raw)) return null;
  return raw;
}

function parseKeepTopN(text: string): number | null {
  const topMatch = text.match(
    /(?:상위\s*)?(\d+)\s*개|(?:만\s*)?(\d+)\s*개\s*(?:만|보여|남|골라)|(\d+)\s*곳\s*(?:만|보여|남|골라)/u,
  );
  if (!topMatch) return null;
  const n = Number(topMatch[1] || topMatch[2] || topMatch[3]);
  if (!Number.isFinite(n) || n < 1 || n > 20) return null;
  return n;
}

/**
 * Parse minRating without stealing digits from 「3개만」 / 「10만원」.
 * Explicit `평점 4.5` wins; bare `평점 높` → default 4.
 */
export function parseMinRatingFromUtterance(text: string): number | null {
  if (!/평점|별점|rating/iu.test(text)) return null;
  const explicit = text.match(
    /(?:평점|별점|rating)\s*(?:이?\s*)?(\d+(?:\.\d+)?)\s*(?:\+|이상|점)?/iu,
  );
  if (explicit?.[1]) {
    const n = Number(explicit[1]);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 4;
  }
  if (/평점\s*높|별점\s*높|rating\s*high/iu.test(text)) return 4;
  return null;
}

export function parseSortByFromUtterance(text: string): ConstraintSortBy | null {
  if (/가성비|싼\s*순|더\s*싸|더\s*싼|저렴한\s*순|cheap|cheaper/iu.test(text)) {
    return "value";
  }
  if (/평점\s*높|별점\s*높|rating/iu.test(text)) return "rating";
  if (/가까운\s*순/iu.test(text)) return "value";
  return null;
}

/**
 * Single NL → Constraint compile (P1 SSOT).
 * Prefer this over ad-hoc regex at Patch / Discovery call sites.
 */
export function compileConstraintMemoryFromUtterance(input: {
  readonly prev?: ConstraintMemoryBag | null | undefined;
  readonly utterance: string;
}): ConstraintMemoryBag {
  return mergeConstraintMemoryFromUtterance({
    prev: input.prev ?? null,
    utterance: input.utterance,
  });
}

export function mergeConstraintMemoryFromUtterance(input: {
  readonly prev: ConstraintMemoryBag | null | undefined;
  readonly utterance: string;
}): ConstraintMemoryBag {
  const base = {
    ...emptyConstraintMemory(),
    ...(input.prev ?? {}),
  };
  const text = input.utterance.trim();
  if (!text) return base;

  const hardPrice = parseMaxNightlyPriceKrw(text);
  const stayType = parseLodgingStayTypeFromText(text);
  const near = extractNearLabelKo(text);
  const minRating = parseMinRatingFromUtterance(text);
  const keepTopN = parseKeepTopN(text);
  const sortBy = parseSortByFromUtterance(text);
  const softBudget = /더\s*싸|저렴|가성비|budget|cheap/iu.test(text);
  const destFromUtterance = extractTravelDestination(text);
  const destPivot =
    isDestinationPivotUtterance(text) &&
    /(?:로|으로)\s*(?:바꿔|변경|가)|바꿔|변경|옮|가자|갈래/iu.test(text);
  const nextDestination =
    destFromUtterance != null &&
    (destPivot || !base.destinationKo || destFromUtterance !== base.destinationKo)
      ? destFromUtterance
      : base.destinationKo;

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
    destinationKo: nextDestination ?? destFromUtterance ?? base.destinationKo,
    nearLabelKo: near ?? (destPivot ? null : base.nearLabelKo),
    stayType: stayType ?? base.stayType,
    minRating: minRating ?? base.minRating,
    keepTopN: keepTopN ?? base.keepTopN,
    sortBy: sortBy ?? base.sortBy,
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
  if (
    bag.destinationKo &&
    !base.toLowerCase().includes(bag.destinationKo.toLowerCase())
  ) {
    bits.push(bag.destinationKo);
  }
  if (bag.nearLabelKo) bits.push(`${bag.nearLabelKo} 근처`);
  if (bag.stayType) {
    const stayKo =
      bag.stayType === "capsule"
        ? "캡슐호텔"
        : bag.stayType === "ryokan"
          ? "료칸"
          : bag.stayType === "hotel"
            ? "호텔"
            : bag.stayType;
    bits.push(stayKo);
  }
  if (bag.maxNightlyPriceKrw != null) {
    bits.push(`1박 ${Math.round(bag.maxNightlyPriceKrw / 10_000)}만원대`);
  } else if (bag.maxPriceBand != null && bag.maxPriceBand <= 2) {
    bits.push("저렴");
  }
  if (bag.minRating != null) bits.push(`평점 ${bag.minRating}+`);
  if (bag.keepTopN != null) bits.push(`${bag.keepTopN}개만`);
  if (bag.sortBy === "value") bits.push("가성비");
  else if (bag.sortBy === "rating") bits.push("평점 높은");
  if (bits.length === 0) return base;
  const extra = bits.filter((b) => {
    const compact = b.replace(/\s+/g, "");
    return compact && !base.includes(compact) && !base.includes(b);
  });
  const filtered = extra.filter((b) => {
    if (/캡슐호텔|료칸|호텔/u.test(b) && /캡슐|료칸|호텔/u.test(base)) {
      return false;
    }
    return true;
  });
  if (filtered.length === 0) return base;
  return `${base} ${filtered.join(" ")}`.trim();
}

export function constraintMemoryLinesKo(
  bag: ConstraintMemoryBag | null | undefined,
): string[] {
  if (!bag) return [];
  const lines: string[] = [];
  if (bag.destinationKo) lines.push(`목적지 · ${bag.destinationKo}`);
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
  if (bag.keepTopN != null) lines.push(`상위 · ${bag.keepTopN}곳`);
  if (bag.sortBy === "value") lines.push("정렬 · 가성비");
  else if (bag.sortBy === "rating") lines.push("정렬 · 평점");
  return lines.slice(0, 6);
}
