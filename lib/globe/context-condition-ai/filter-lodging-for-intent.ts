/**
 * Post-fetch lodging filter — kind (hostel/guesthouse) + hard nightly price cap.
 * Retrieval often returns Hilton-tier "lodging"; intent must actually reshape the set.
 */

import type {
  LocalDiscoveryBudget,
  LocalDiscoveryLodgingKind,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  lodgingRowMatchesStayType,
  resolveLodgingStaySearchKeyword,
  type LodgingStayType,
} from "@/lib/globe/lodging/lodging-stay-types";

const HOSTEL_SIGNAL_RE =
  /게스트\s*하우스|게스트하우스|호스텔|hostel|guesthouse|guest\s*house|backpacker|유스\s*호스텔|youth\s*hostel|capsule|캡슐\s*호텔|도미토리|dormitory|민박|bnb|guest\s*house/iu;

const LUXURY_SIGNAL_RE =
  /hilton|hyatt|marriott|sheraton|intercontinental|shangri|ritz|st\s*regis|conrad|w\s+hotel|four\s*seasons|mandarin|peninsula|park\s*hyatt|grand\s*hyatt|kimpton|ihg|radisson|westin|novotel\s*suite|리itz|힐튼|하얏트|메리어트|쉐라톤|콘래드/iu;

/** Soft default when user asks hostel/guesthouse without an explicit 만원 cap. */
export const HOSTEL_DEFAULT_MAX_NIGHTLY_KRW = 80_000;

export function lodgingRowMatchesHostelSignal(
  row: ContextLodgingInventoryRow,
): boolean {
  const blob = `${row.name} ${row.address ?? ""} ${row.partnerLabel ?? ""}`;
  return HOSTEL_SIGNAL_RE.test(blob);
}

export function lodgingRowLooksLuxury(row: ContextLodgingInventoryRow): boolean {
  const blob = `${row.name} ${row.address ?? ""}`;
  return LUXURY_SIGNAL_RE.test(blob);
}

function nightlyPriceKrw(row: ContextLodgingInventoryRow): number | null {
  if (row.priceKrw != null && Number.isFinite(row.priceKrw) && row.priceKrw > 0) {
    return row.priceKrw;
  }
  const room = row.roomOffers?.find(
    (offer) => offer.priceKrw != null && Number.isFinite(offer.priceKrw),
  );
  if (room?.priceKrw != null && room.priceKrw > 0) {
    return room.priceKrw;
  }
  return null;
}

/**
 * Parse "하루 3만원 미만", "하루에 3만원대", "3만 이하", "30000원 아래" → nightly KRW cap.
 */
export function parseMaxNightlyPriceKrw(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const manUnder = trimmed.match(
    /(\d+(?:\.\d+)?)\s*만\s*원?\s*(?:미만|이하|아래|안|이내|컷|까지|대)/iu,
  );
  if (manUnder?.[1] && /미만|이하|아래|안|이내|컷|까지|대/iu.test(manUnder[0])) {
    return Math.round(Number(manUnder[1]) * 10_000);
  }

  // 「하루 3만」·「하루에 3만원대」·「1박에 5만」
  const dayMan = trimmed.match(
    /(?:하루(?:에)?|1\s*박(?:에)?|일\s*박(?:에)?|박당|night(?:ly)?)\s*(\d+(?:\.\d+)?)\s*만/iu,
  );
  if (dayMan?.[1]) {
    return Math.round(Number(dayMan[1]) * 10_000);
  }

  // 「3만원대」·「3만짜리」 alone = soft nightly ceiling
  const manBand = trimmed.match(
    /(\d+(?:\.\d+)?)\s*만\s*원?\s*(?:짜리|대)/iu,
  );
  if (manBand?.[1]) {
    return Math.round(Number(manBand[1]) * 10_000);
  }

  const manBare = trimmed.match(
    /(\d+(?:\.\d+)?)\s*만\s*원?\s*(?:짜리|대)?/iu,
  );
  if (
    manBare?.[1] &&
    /미만|이하|아래|싸|저렴|저가|budget|cheap|게스트|호스텔|hostel|다시\s*찾/iu.test(
      trimmed,
    )
  ) {
    return Math.round(Number(manBare[1]) * 10_000);
  }

  const wonUnder = trimmed.match(
    /(\d{4,7})\s*원\s*(?:미만|이하|아래|안|이내)/iu,
  );
  if (wonUnder?.[1]) {
    return Math.round(Number(wonUnder[1]));
  }

  const underEn = trimmed.match(
    /(?:under|below|max|less\s+than)\s*₩?\s*(\d[\d,]*)/iu,
  );
  if (underEn?.[1]) {
    return Math.round(Number(underEn[1].replace(/,/g, "")));
  }

  return null;
}

export function resolveLodgingSearchKeyword(input: {
  lodgingKind: LocalDiscoveryLodgingKind;
  message?: string | null;
  lodgingStayType?: LodgingStayType | null;
  areaHint?: string | null;
}): string | null {
  return resolveLodgingStaySearchKeyword({
    stayType: input.lodgingStayType,
    lodgingKind: input.lodgingKind,
    message: input.message,
    areaHint: input.areaHint,
  });
}

function filterByMaxPrice(
  rows: readonly ContextLodgingInventoryRow[],
  maxNightlyPriceKrw: number,
): ContextLodgingInventoryRow[] {
  const within = rows.filter((row) => {
    const price = nightlyPriceKrw(row);
    if (price == null) {
      return false;
    }
    return price <= maxNightlyPriceKrw;
  });
  if (within.length > 0) {
    return within;
  }
  // Soft fallthrough: unknown price kept only if not luxury when cap is tight.
  return rows.filter((row) => {
    const price = nightlyPriceKrw(row);
    if (price == null) {
      return !lodgingRowLooksLuxury(row);
    }
    return price <= maxNightlyPriceKrw * 1.15;
  });
}

/**
 * Shape inventory to user intent. Prefer hard filters; soft-relax only when empty.
 */
export function filterLodgingRowsForIntent(input: {
  rows: readonly ContextLodgingInventoryRow[];
  lodgingKind: LocalDiscoveryLodgingKind;
  budget: LocalDiscoveryBudget;
  maxNightlyPriceKrw?: number | null;
  lodgingStayType?: LodgingStayType | null;
}): ContextLodgingInventoryRow[] {
  let rows = [...input.rows];
  const stayType = input.lodgingStayType ?? null;
  const cap =
    input.maxNightlyPriceKrw != null &&
    Number.isFinite(input.maxNightlyPriceKrw) &&
    input.maxNightlyPriceKrw > 0
      ? Math.round(input.maxNightlyPriceKrw)
      : input.lodgingKind === "hostel"
        ? HOSTEL_DEFAULT_MAX_NIGHTLY_KRW
        : null;

  if (stayType) {
    const typedHits = rows.filter((row) => lodgingRowMatchesStayType(row, stayType));
    if (typedHits.length > 0) {
      rows = typedHits;
    } else if (input.lodgingKind === "hostel" || stayType === "capsule") {
      // Never soft-keep business/APA hotels when user asked capsule/hostel.
      const hostelHits = rows.filter(lodgingRowMatchesHostelSignal);
      rows =
        hostelHits.length > 0
          ? hostelHits
          : rows.filter(
              (row) =>
                !lodgingRowLooksLuxury(row) &&
                !/apa\b|아파|アパ|hilton|hyatt|marriott|business\s*hotel|비즈니스/iu.test(
                  `${row.name} ${row.address ?? ""}`,
                ),
            );
    }
  } else if (input.lodgingKind === "hostel") {
    const hostelHits = rows.filter(lodgingRowMatchesHostelSignal);
    if (hostelHits.length > 0) {
      rows = hostelHits;
    } else {
      rows = rows.filter((row) => !lodgingRowLooksLuxury(row));
    }
  }

  if (cap != null) {
    const capped = filterByMaxPrice(rows, cap);
    if (capped.length > 0) {
      rows = capped;
    } else if (
      input.lodgingKind === "hostel" ||
      stayType === "capsule" ||
      stayType === "hostel" ||
      stayType === "guesthouse"
    ) {
      // Hard Field: do not re-surface over-budget business hotels.
      rows = rows
        .filter((row) => {
          const price = nightlyPriceKrw(row);
          if (price != null && price > cap) {
            return false;
          }
          return (
            !lodgingRowLooksLuxury(row) &&
            !/apa\b|아파|アパ/iu.test(`${row.name} ${row.address ?? ""}`)
          );
        })
        .sort((a, b) => (nightlyPriceKrw(a) ?? 1e12) - (nightlyPriceKrw(b) ?? 1e12));
    }
  } else if (input.budget === "low") {
    rows = [...rows]
      .filter((row) => !lodgingRowLooksLuxury(row))
      .sort((a, b) => (nightlyPriceKrw(a) ?? 1e12) - (nightlyPriceKrw(b) ?? 1e12));
  }

  return rows;
}
