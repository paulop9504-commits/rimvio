import { marketListingConditionLabelKo } from "@/lib/globe/market/market-intent-detail";
import { scoreWeightedMarketAlignment } from "@/lib/globe/market/score-weighted-market-alignment";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { calibrateOpportunityPct } from "@/lib/globe/opportunity-field/calibrate-opportunity-pct";
import { explainOpportunityReasonKo } from "@/lib/globe/opportunity-field/explain-opportunity-reason";
import {
  isListingCandidateForSeeking,
  resolveViewerDistanceKm,
} from "@/lib/globe/opportunity-field/filter-listing-candidates";
import type {
  OpportunityFieldCopy,
  OpportunityRow,
  UserStateV1,
} from "@/lib/globe/opportunity-field/types";

function formatPriceKrw(record: MarketIntentRecord): {
  price: number | null;
  priceLine: string;
} {
  const { priceMinKrw, priceMaxKrw } = record;
  if (priceMinKrw === null && priceMaxKrw === null) {
    return { price: null, priceLine: "가격 협의" };
  }
  if (priceMinKrw !== null && priceMaxKrw !== null) {
    if (priceMinKrw === priceMaxKrw) {
      const line = `${Math.round(priceMinKrw / 10_000)}만원`;
      return { price: priceMinKrw, priceLine: line };
    }
    return {
      price: priceMinKrw,
      priceLine: `${Math.round(priceMinKrw / 10_000)}~${Math.round(priceMaxKrw / 10_000)}만원`,
    };
  }
  const value = priceMinKrw ?? priceMaxKrw ?? 0;
  return { price: value, priceLine: `${Math.round(value / 10_000)}만원` };
}

function readConditionLabel(listing: MarketIntentRecord): string {
  const battery = listing.detail.prioritySlots?.battery_health;
  if (typeof battery === "number" && Number.isFinite(battery)) {
    return `배터리 ${battery}%`;
  }
  if (typeof battery === "string" && battery.trim()) {
    return `배터리 ${battery.trim()}`;
  }
  if (listing.detail.conditionId) {
    return marketListingConditionLabelKo(listing.detail.conditionId);
  }
  return "상태 확인";
}

function focusBoost(seeking: MarketIntentRecord, userState: UserStateV1): number {
  if (
    userState.primaryEventId &&
    seeking.eventId === userState.primaryEventId
  ) {
    return 1.25;
  }
  return 1;
}

export function scoreMarketplaceOpportunityRow(input: {
  seeking: MarketIntentRecord;
  listing: MarketIntentRecord;
  userState: UserStateV1;
  copy: OpportunityFieldCopy;
}): OpportunityRow | null {
  if (!isListingCandidateForSeeking(input.seeking, input.listing)) {
    return null;
  }

  const weighted = scoreWeightedMarketAlignment(input.seeking, input.listing);
  const distanceKm = resolveViewerDistanceKm({
    seeking: input.seeking,
    listing: input.listing,
    lat: input.userState.gpsFresh ? input.userState.lat : null,
    lng: input.userState.gpsFresh ? input.userState.lng : null,
  });

  let fieldScore = weighted.total * focusBoost(input.seeking, input.userState);
  if (input.userState.gpsFresh && distanceKm <= 2) {
    fieldScore = Math.min(1, fieldScore * 1.06);
  }
  fieldScore = Math.max(0, Math.min(1, fieldScore));

  const { reasonKo, matchReasons } = explainOpportunityReasonKo({
    weighted,
    distanceKm,
    confirmedAtIso: input.listing.confirmedAtIso,
    now: input.userState.now,
    copy: input.copy,
  });

  const { price, priceLine } = formatPriceKrw(input.listing);
  const title =
    input.listing.detail.productName.trim() ||
    input.listing.title.trim() ||
    "매물";

  return {
    listingId: input.listing.id,
    listingEventId: input.listing.eventId,
    photoUrl: input.listing.detail.photoUrls?.[0]?.trim() || null,
    videoUrl: input.listing.detail.videoUrls?.[0]?.trim() || null,
    title,
    price,
    priceLine,
    conditionLabel: readConditionLabel(input.listing),
    reasonKo,
    scorePct: calibrateOpportunityPct(fieldScore),
    fieldScore,
    distanceKm,
    listing: input.listing,
    matchReasons,
  };
}
