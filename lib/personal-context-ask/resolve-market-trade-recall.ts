import type { EventCandidate } from "@/lib/events/event-candidate";
import { readMarketCompletionMeta } from "@/lib/globe/market/market-completion-metadata";
import type {
  ParsedPersonalContextQuery,
  PersonalContextBridgeHit,
} from "@/lib/personal-context-ask/personal-context-ask-types";
import type { RecallEventSnapshot } from "@/lib/recall/recall-event-snapshot";

const MAX_HITS = 5;

function productMatches(
  snapshot: RecallEventSnapshot,
  parsed: ParsedPersonalContextQuery,
): boolean {
  const needles = [...parsed.productNeedles, ...parsed.placeNeedles];
  if (needles.length === 0) {
    return true;
  }
  const haystack = [
    snapshot.marketProductName,
    snapshot.title,
    snapshot.headline,
    ...snapshot.marketTokens,
    ...snapshot.noteTokens,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function yearMatches(snapshot: RecallEventSnapshot, year: number | null): boolean {
  if (year === null) {
    return true;
  }
  return snapshot.year === year;
}

function sortByTimeDesc(
  a: RecallEventSnapshot,
  b: RecallEventSnapshot,
): number {
  const aMs = a.atIso ? Date.parse(a.atIso) : 0;
  const bMs = b.atIso ? Date.parse(b.atIso) : 0;
  return bMs - aMs;
}

function toMarketHit(
  snapshot: RecallEventSnapshot,
  event: EventCandidate | undefined,
  parsed: ParsedPersonalContextQuery,
): PersonalContextBridgeHit {
  const meta = event ? readMarketCompletionMeta(event) : null;
  const productName = snapshot.marketProductName ?? meta?.productName ?? snapshot.title;
  const priceLine = snapshot.marketPriceLine ?? meta?.priceLine ?? null;
  const realizedPriceKrw =
    snapshot.marketRealizedPriceKrw ?? meta?.realizedPriceKrw ?? null;
  const reasonKo =
    parsed.intent === "sell_price_recall"
      ? "판매 가격"
      : parsed.intent === "market_trade_recall"
        ? "맞춤 거래"
        : "거래 기록";

  return {
    eventId: snapshot.eventId,
    title: snapshot.title,
    headline: snapshot.headline,
    place: snapshot.place,
    atIso: snapshot.atIso,
    people: snapshot.people,
    reasonKo,
    photoCount: 0,
    dwellDays: null,
    photoPreviews: [],
    contextKind: "맞춤",
    spotLabels: [],
    periodEndIso: null,
    marketProductName: productName,
    marketPriceLine: priceLine,
    marketRealizedPriceKrw: realizedPriceKrw,
    marketRole: meta?.role ?? null,
  };
}

/** Market completion traces — sell price / trade recall. */
export function resolveMarketTradeRecall(
  snapshots: readonly RecallEventSnapshot[],
  events: readonly EventCandidate[],
  parsed: ParsedPersonalContextQuery,
): PersonalContextBridgeHit[] {
  const eventById = new Map(events.map((event) => [event.id, event]));

  return snapshots
    .filter((row) => row.marketCompletion)
    .filter((row) => productMatches(row, parsed))
    .filter((row) => yearMatches(row, parsed.year))
    .sort(sortByTimeDesc)
    .slice(0, MAX_HITS)
    .map((row) => toMarketHit(row, eventById.get(row.eventId), parsed));
}
