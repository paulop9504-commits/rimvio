import {
  DEFAULT_MARKET_INTENT_DETAIL,
  marketListingConditionLabelKo,
} from "@/lib/globe/market/market-intent-detail";
import { formatMarketPriceLine } from "@/lib/globe/market/format-market-price-line";
import { pickMarketListingThumbUrls } from "@/lib/globe/market/market-listing-media";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";
import { calibrateOpportunityPct } from "@/lib/globe/opportunity-field/calibrate-opportunity-pct";
import type {
  OpportunityFieldCopy,
  OpportunityRow,
  UserStateV1,
} from "@/lib/globe/opportunity-field/types";
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

function recencyBoost(confirmedAtIso: string, now: Date): number {
  const ageMs = now.getTime() - Date.parse(confirmedAtIso);
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 0.5;
  }
  const days = ageMs / (24 * 60 * 60 * 1000);
  if (days <= 1) {
    return 1;
  }
  if (days <= 7) {
    return 0.82;
  }
  if (days <= 30) {
    return 0.65;
  }
  return 0.45;
}

function distanceScore(distanceKm: number | null): number {
  if (distanceKm == null) {
    return 0.55;
  }
  if (distanceKm <= 1) {
    return 1;
  }
  if (distanceKm <= 3) {
    return 0.88;
  }
  if (distanceKm <= 8) {
    return 0.72;
  }
  if (distanceKm <= 15) {
    return 0.55;
  }
  return 0.35;
}

/** 밖 지구 browse — no own seeking pill required. */
export function listExternalBrowseRows(input: {
  pool: readonly MarketIntentRecord[];
  userState: UserStateV1;
  copy: OpportunityFieldCopy;
  regionalProfile?: RegionalProfile;
  limit?: number;
}): OpportunityRow[] {
  const profile = input.regionalProfile ?? resolveRegionalProfile("KR");
  const limit = input.limit ?? 48;
  const listings = input.pool.filter((row) => row.active && row.role === "listing");

  const rows: OpportunityRow[] = [];
  for (const listing of listings) {
    const listingDetail = listing.detail ?? DEFAULT_MARKET_INTENT_DETAIL;
    const distanceKm =
      input.userState.lat != null &&
      input.userState.lng != null &&
      Number.isFinite(input.userState.lat) &&
      Number.isFinite(input.userState.lng)
        ? haversineKm(
            input.userState.lat,
            input.userState.lng,
            listing.anchorLat,
            listing.anchorLng,
          )
        : null;

    const fieldScore = Math.max(
      0,
      Math.min(
        1,
        distanceScore(distanceKm) * 0.62 +
          recencyBoost(listing.confirmedAtIso, input.userState.now) * 0.38,
      ),
    );

    const title =
      listingDetail.productName.trim() || listing.title.trim() || "밖 지구 자원";
    const line = formatMarketPriceLine(
      listing.priceMinKrw,
      listing.priceMaxKrw,
      profile,
      input.copy.reasonPrice,
    );
    const thumbUrls = pickMarketListingThumbUrls(listingDetail);
    const reasonKo =
      distanceKm != null
        ? `${input.copy.reasonDistance} · ${distanceKm.toFixed(1)}km`
        : input.copy.reasonRecency;

    rows.push({
      listingId: listing.id,
      listingEventId: listing.eventId,
      photoUrl: thumbUrls.photoUrl,
      videoUrl: thumbUrls.videoUrl,
      title,
      price: listing.priceMinKrw ?? listing.priceMaxKrw,
      priceLine: line,
      conditionLabel: readConditionLabel(listing),
      reasonKo,
      scorePct: calibrateOpportunityPct(fieldScore),
      fieldScore,
      distanceKm,
      listing,
      matchReasons: [reasonKo],
    });
  }

  return rows
    .sort(
      (left, right) =>
        right.fieldScore - left.fieldScore ||
        (left.distanceKm ?? 99) - (right.distanceKm ?? 99),
    )
    .slice(0, limit);
}
