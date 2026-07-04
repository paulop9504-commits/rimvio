import {
  marketCategoriesCompatible,
  marketCategoryLabelKo,
} from "@/lib/globe/market/market-category-registry";
import { resolveMarketIntentExposureAnchor } from "@/lib/globe/market/market-intent-exposure";
import { getCategoryPriorityMatrix } from "@/lib/globe/market/market-priority-matrix";
import { scoreWeightedMarketAlignment } from "@/lib/globe/market/score-weighted-market-alignment";
import type {
  MarketAlignmentOffer,
  MarketIntentRecord,
} from "@/lib/globe/market/market-intent-types";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

function rolesComplement(
  a: MarketIntentRecord,
  b: MarketIntentRecord,
): boolean {
  return (
    (a.role === "seeking" && b.role === "listing") ||
    (a.role === "listing" && b.role === "seeking")
  );
}

function withinRadius(
  a: MarketIntentRecord,
  b: MarketIntentRecord,
): boolean {
  const aAnchor = resolveMarketIntentExposureAnchor(a);
  const bAnchor = resolveMarketIntentExposureAnchor(b);
  const distanceKm = haversineKm(
    aAnchor.lat,
    aAnchor.lng,
    bAnchor.lat,
    bAnchor.lng,
  );
  const allowed = Math.min(a.radiusKm, b.radiusKm);
  return distanceKm <= allowed;
}

function buildPriorityHintKo(
  self: MarketIntentRecord,
  weighted: ReturnType<typeof scoreWeightedMarketAlignment>,
): string {
  const matrix = getCategoryPriorityMatrix(self.categoryId);
  const guide = self.role === "seeking" ? matrix.seekerGuideKo : matrix.sellerGuideKo;
  if (weighted.topMatchedLabelsKo.length === 0) {
    return guide;
  }
  return `${guide} · ${weighted.topMatchedLabelsKo.join(" · ")} 맞음`;
}

export function resolveMarketAlignment(input: {
  intents: MarketIntentRecord[];
  focusEventId?: string | null;
  copy: {
    headlineSeeking: (title: string, place: string) => string;
    headlineListing: (title: string, place: string) => string;
    body: (
      category: string,
      distanceKm: number,
      priceLine: string,
    ) => string;
    cta: string;
  };
}): MarketAlignmentOffer | null {
  const active = input.intents.filter((row) => row.active);
  if (active.length < 2) {
    return null;
  }

  const focusId = input.focusEventId?.trim();
  const ordered = focusId
    ? [
        ...active.filter((row) => row.eventId === focusId),
        ...active.filter((row) => row.eventId !== focusId),
      ]
    : active;

  let best: {
    self: MarketIntentRecord;
    other: MarketIntentRecord;
    weighted: ReturnType<typeof scoreWeightedMarketAlignment>;
    distanceKm: number;
  } | null = null;

  for (const self of ordered) {
    for (const other of active) {
      if (other.eventId === self.eventId) {
        continue;
      }
      if (self.userId && other.userId && self.userId === other.userId) {
        continue;
      }
      if (!rolesComplement(self, other)) {
        continue;
      }
      if (!marketCategoriesCompatible(self.categoryId, other.categoryId)) {
        continue;
      }
      if (!withinRadius(self, other)) {
        continue;
      }

      const weighted = scoreWeightedMarketAlignment(self, other);
      if (!weighted.passes) {
        continue;
      }

      const selfAnchor = resolveMarketIntentExposureAnchor(self);
      const otherAnchor = resolveMarketIntentExposureAnchor(other);
      const distanceKm = haversineKm(
        selfAnchor.lat,
        selfAnchor.lng,
        otherAnchor.lat,
        otherAnchor.lng,
      );

      if (!best || weighted.total > best.weighted.total) {
        best = { self, other, weighted, distanceKm };
      }
    }
  }

  if (!best) {
    return null;
  }

  const { self, other, weighted, distanceKm } = best;
  const match = other;
  const matchAnchor = resolveMarketIntentExposureAnchor(match);
  const category = marketCategoryLabelKo(match.categoryId);
  const priceLine =
    match.priceMinKrw !== null && match.priceMaxKrw !== null
      ? match.priceMinKrw === match.priceMaxKrw
        ? `${Math.round(match.priceMinKrw / 10_000)}만원`
        : `${Math.round((match.priceMinKrw ?? 0) / 10_000)}~${Math.round((match.priceMaxKrw ?? 0) / 10_000)}만원`
      : "가격 협의";

  const headline =
    self.role === "seeking"
      ? input.copy.headlineSeeking(match.title, matchAnchor.placeLabel || "근처")
      : input.copy.headlineListing(match.title, matchAnchor.placeLabel || "근처");

  return {
    selfIntentId: self.id,
    matchIntentId: match.id,
    selfEventId: self.eventId,
    matchEventId: match.eventId,
    role: self.role,
    headline,
    body: input.copy.body(
      category,
      Math.round(distanceKm * 10) / 10,
      priceLine,
    ),
    ctaLabel: input.copy.cta,
    matchLat: matchAnchor.lat,
    matchLng: matchAnchor.lng,
    matchPlaceLabel: matchAnchor.placeLabel,
    distanceKm,
    categoryId: match.categoryId,
    sourceRef: "market:alignment_v1.2",
    alignmentScore: Math.round(weighted.total * 100) / 100,
    priorityHintKo: buildPriorityHintKo(self, weighted),
  };
}
