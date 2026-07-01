import { copy } from "@/lib/copy/human-ko";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import { isMarketIntentPublishedExternal } from "@/lib/globe/market/market-intent-detail";
import { listActiveMarketIntents } from "@/lib/globe/market/market-alignment-store";
import { scoreWeightedMarketAlignment } from "@/lib/globe/market/score-weighted-market-alignment";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";
import { formatMarketPriceLine } from "@/lib/globe/market/format-market-price-line";
import type {
  ResourceInquirySummary,
  ResourceMatchedPerson,
  ResourceStatus,
} from "@/lib/resource/resource-status-types";

function rolesComplement(a: MarketIntentRecord, b: MarketIntentRecord): boolean {
  return (
    (a.role === "seeking" && b.role === "listing") ||
    (a.role === "listing" && b.role === "seeking")
  );
}

function withinRadius(a: MarketIntentRecord, b: MarketIntentRecord): boolean {
  const distanceKm = haversineKm(a.anchorLat, a.anchorLng, b.anchorLat, b.anchorLng);
  return distanceKm <= Math.min(a.radiusKm, b.radiusKm);
}

function scanMatchedCandidates(
  record: MarketIntentRecord,
  pool: MarketIntentRecord[],
  limit = 3,
): ResourceMatchedPerson[] {
  const matches: Array<ResourceMatchedPerson & { score: number }> = [];

  for (const other of pool) {
    if (other.eventId === record.eventId || !other.active) {
      continue;
    }
    if (record.userId && other.userId && record.userId === other.userId) {
      continue;
    }
    if (!rolesComplement(record, other)) {
      continue;
    }
    if (!withinRadius(record, other)) {
      continue;
    }
    const weighted = scoreWeightedMarketAlignment(
      record.role === "seeking" ? record : other,
      record.role === "listing" ? record : other,
    );
    if (!weighted.passes) {
      continue;
    }
    const distanceKm = haversineKm(
      record.anchorLat,
      record.anchorLng,
      other.anchorLat,
      other.anchorLng,
    );
    const category = marketCategoryLabelKo(other.categoryId);
    matches.push({
      matchIntentId: other.id,
      matchEventId: other.eventId,
      displayNameKo:
        other.detail.productName?.trim() ||
        other.title.trim() ||
        copy.globe.marketTradePlaceProductFallback,
      distanceKm: Math.round(distanceKm * 10) / 10,
      interestHintKo:
        weighted.topMatchedLabelsKo.length > 0
          ? `${category} · ${weighted.topMatchedLabelsKo[0]}`
          : `${category} · 근처 ${Math.round(distanceKm)}km`,
      score: weighted.total,
    });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...row }) => row);
}

function readInquiriesForIntent(
  record: MarketIntentRecord,
  sessions: readonly MarketTradeSessionView[],
): ResourceInquirySummary[] {
  return sessions
    .filter(
      (session) =>
        session.listingIntentId === record.id || session.seekingIntentId === record.id,
    )
    .map((session) => ({
      handshakeId: session.handshakeId,
      threadId: session.threadId,
      statusHeadlineKo: session.statusHeadlineKo,
      counterpartyLabelKo: session.productTitle || copy.globe.field.chatCta,
    }));
}

function estimateViews(input: {
  inquiries: number;
  matches: number;
  publishedExternal: boolean;
}): number {
  if (!input.publishedExternal && input.inquiries === 0 && input.matches === 0) {
    return 0;
  }
  return Math.max(input.inquiries * 3 + input.matches * 4, input.publishedExternal ? 4 : 1);
}

/** Aggregate AI activity for a single owned resource (client-safe). */
export function resolveResourceStatus(input: {
  record: MarketIntentRecord;
  tradeSessions?: readonly MarketTradeSessionView[];
  priceProfile?: Parameters<typeof formatMarketPriceLine>[2];
}): ResourceStatus {
  const pool = listActiveMarketIntents();
  const inquiries = readInquiriesForIntent(input.record, input.tradeSessions ?? []);
  const matchedCandidates = scanMatchedCandidates(input.record, pool);
  const publishedExternal = isMarketIntentPublishedExternal(input.record.detail);
  const title =
    input.record.detail.productName?.trim() ||
    input.record.title.trim() ||
    copy.globe.marketTradePlaceProductFallback;

  return {
    resourceId: input.record.id,
    eventId: input.record.eventId,
    productTitleKo: title,
    priceLineKo: formatMarketPriceLine(
      input.record.priceMinKrw,
      input.record.priceMaxKrw,
      input.priceProfile,
    ),
    aiActivity: {
      views: estimateViews({
        inquiries: inquiries.length,
        matches: matchedCandidates.length,
        publishedExternal,
      }),
      inquiries,
      matchedCandidates,
    },
    visibility: {
      innerGlobe: true,
      outerGlobe: publishedExternal,
    },
    anchorLat: input.record.anchorLat,
    anchorLng: input.record.anchorLng,
  };
}
