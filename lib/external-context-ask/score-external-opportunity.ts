import type { ExternalQueryIntent } from "@/lib/external-context-ask/external-context-opportunity-types";
import type { NormalizedExternalOpportunity } from "@/lib/external-context-ask/normalize-external-opportunity-sources";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { MarketCategoryId } from "@/lib/globe/market/market-intent-types";
import type { ParsedPersonalContextQuery } from "@/lib/personal-context-ask/personal-context-ask-types";

const PRODUCT_CATEGORY_HINTS: ReadonlyArray<{
  pattern: RegExp;
  category: MarketCategoryId;
}> = [
  { pattern: /아이폰|갤럭시|폰|스마트폰|phone/i, category: "market.phone" },
  { pattern: /자전거|바이크|bike/i, category: "market.bike" },
  { pattern: /카메라|렌즈|camera/i, category: "market.camera" },
  { pattern: /캠핑|camping/i, category: "market.camping" },
  { pattern: /가구|책상|의자|furniture/i, category: "market.furniture" },
  { pattern: /옷|패션|fashion/i, category: "market.fashion" },
];

function readCategoryHint(query: string): MarketCategoryId | null {
  for (const hint of PRODUCT_CATEGORY_HINTS) {
    if (hint.pattern.test(query)) {
      return hint.category;
    }
  }
  return null;
}

function intentKindBoost(
  intent: ExternalQueryIntent,
  row: NormalizedExternalOpportunity,
): number {
  switch (intent) {
    case "trade":
      if (row.kind === "market_intent" || row.kind === "alignment_chat") {
        return 24;
      }
      return 0;
    case "travel":
      if (row.kind === "external_trace" && /여행|trip|travel/i.test(row.searchText)) {
        return 18;
      }
      if (row.kind === "external_trace") {
        return 10;
      }
      return 0;
    case "gathering":
      if (row.kind === "external_trace") {
        return 16;
      }
      return 4;
    case "study":
      if (/스터디|study|영어/i.test(row.searchText)) {
        return 20;
      }
      return 0;
    default:
      return 4;
  }
}

function recencyBoost(atIso: string | null, now: Date): number {
  if (!atIso) {
    return 0;
  }
  const ms = Date.parse(atIso);
  if (Number.isNaN(ms)) {
    return 0;
  }
  const ageDays = (now.getTime() - ms) / 86_400_000;
  if (ageDays <= 3) {
    return 12;
  }
  if (ageDays <= 14) {
    return 8;
  }
  if (ageDays <= 45) {
    return 4;
  }
  return 0;
}

function distanceBoost(
  row: NormalizedExternalOpportunity,
  lat: number | null | undefined,
  lng: number | null | undefined,
): number {
  if (
    lat == null ||
    lng == null ||
    row.lat == null ||
    row.lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return 0;
  }
  const km = haversineKm(lat, lng, row.lat, row.lng);
  if (km <= 3) {
    return 16;
  }
  if (km <= 8) {
    return 10;
  }
  if (km <= 20) {
    return 5;
  }
  return 0;
}

function tokenMatchBoost(
  row: NormalizedExternalOpportunity,
  parsed: ParsedPersonalContextQuery,
  rawQuery: string,
): number {
  let score = 0;
  const haystack = row.searchText.toLowerCase();
  const needles = [
    ...parsed.placeNeedles,
    ...parsed.personNeedles,
    ...rawQuery
      .replace(/[?!.,]/gu, " ")
      .split(/\s+/u)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2),
  ];

  const seen = new Set<string>();
  for (const needle of needles) {
    const key = needle.toLowerCase();
    if (seen.has(key) || key.length < 2) {
      continue;
    }
    seen.add(key);
    if (haystack.includes(key)) {
      score += 22;
    }
  }
  return score;
}

function categoryBoost(
  row: NormalizedExternalOpportunity,
  categoryHint: MarketCategoryId | null,
): number {
  if (!categoryHint || row.kind !== "market_intent") {
    return 0;
  }
  return row.searchText.includes(categoryHint) ? 28 : 0;
}

export function scoreExternalOpportunity(input: {
  row: NormalizedExternalOpportunity;
  parsed: ParsedPersonalContextQuery;
  intent: ExternalQueryIntent;
  now: Date;
  lat?: number | null;
  lng?: number | null;
}): number {
  const { row, parsed, intent, now } = input;
  const categoryHint = readCategoryHint(parsed.raw);
  return (
    tokenMatchBoost(row, parsed, parsed.raw) +
    intentKindBoost(intent, row) +
    categoryBoost(row, categoryHint) +
    recencyBoost(row.atIso, now) +
    distanceBoost(row, input.lat, input.lng)
  );
}

export function reasonKoForScore(score: number): string {
  if (score >= 50) {
    return "의도와 잘 맞아요";
  }
  if (score >= 30) {
    return "근처 공개 맥락";
  }
  return "참고할 만한 맥락";
}
