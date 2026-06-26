import {
  DEFAULT_MARKET_INTENT_DETAIL,
  marketListingConditionLabelKo,
} from "@/lib/globe/market/market-intent-detail";
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

import { formatMarketPriceLine } from "@/lib/globe/market/format-market-price-line";
import { pickMarketListingThumbUrls } from "@/lib/globe/market/market-listing-media";
import type { RegionalProfile } from "@/lib/preferences/regional-profile";
import { resolveRegionalProfile } from "@/lib/preferences/regional-profile";

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
  regionalProfile?: RegionalProfile;
}): OpportunityRow | null {
  if (!isListingCandidateForSeeking(input.seeking, input.listing)) {
    return null;
  }

  const listingDetail = input.listing.detail ?? DEFAULT_MARKET_INTENT_DETAIL;
  const seekingDetail = input.seeking.detail ?? DEFAULT_MARKET_INTENT_DETAIL;
  const listing = { ...input.listing, detail: listingDetail };
  const seeking = { ...input.seeking, detail: seekingDetail };

  const weighted = scoreWeightedMarketAlignment(seeking, listing);
  const distanceKm = resolveViewerDistanceKm({
    seeking,
    listing,
    lat: input.userState.gpsFresh ? input.userState.lat : null,
    lng: input.userState.gpsFresh ? input.userState.lng : null,
  });

  let fieldScore = weighted.total * focusBoost(seeking, input.userState);
  if (input.userState.gpsFresh && distanceKm <= 2) {
    fieldScore = Math.min(1, fieldScore * 1.06);
  }
  fieldScore = Math.max(0, Math.min(1, fieldScore));

  const { reasonKo, matchReasons } = explainOpportunityReasonKo({
    weighted,
    distanceKm,
    confirmedAtIso: listing.confirmedAtIso,
    now: input.userState.now,
    copy: input.copy,
  });

  const profile = input.regionalProfile ?? resolveRegionalProfile("KR");
  const { price, priceLine } = (() => {
    const { priceMinKrw, priceMaxKrw } = listing;
    const line = formatMarketPriceLine(priceMinKrw, priceMaxKrw, profile, input.copy.reasonPrice);
    const priceValue = priceMinKrw ?? priceMaxKrw;
    return { price: priceValue, priceLine: line };
  })();
  const title =
    listingDetail.productName.trim() ||
    listing.title.trim() ||
    "매물";

  const thumbUrls = pickMarketListingThumbUrls(listingDetail);

  return {
    listingId: listing.id,
    listingEventId: listing.eventId,
    photoUrl: thumbUrls.photoUrl,
    videoUrl: thumbUrls.videoUrl,
    title,
    price,
    priceLine,
    conditionLabel: readConditionLabel(listing),
    reasonKo,
    scorePct: calibrateOpportunityPct(fieldScore),
    fieldScore,
    distanceKm,
    listing,
    matchReasons,
  };
}
