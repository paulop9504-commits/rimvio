import { copy } from "@/lib/copy/human-ko";
import type {
  GlobeEateryDiscoveryCard,
  GlobeEateryDiscoverySession,
} from "@/lib/globe/eatery/project-eatery-discovery-session";
import type {
  GlobeLodgingDiscoveryCard,
  GlobeLodgingDiscoverySession,
} from "@/lib/globe/lodging/project-lodging-discovery-session";

export type ReactiveDiscoveryDomain = "eatery" | "lodging";

export type ReactiveDiscoveryRefinement = {
  relatedResourceIds: string[];
  signalChips: string[];
  source: "rules" | "llm";
};

export type ReactiveDiscoveryContextEvent = {
  id: string;
  title: string;
  place: string | null;
};

export type ReactiveDiscoveryRouteCard = {
  resourceId: string;
  title: string;
  shortLabel: string;
  detailReasonLine: string;
  score100: number;
  distanceM: number | null;
  priceLabel?: string | null;
  priceKrw?: number | null;
};

export type ReactiveDiscoveryRouteRequest = {
  domain: ReactiveDiscoveryDomain;
  contextEvent: ReactiveDiscoveryContextEvent;
  matchedPersonName: string | null;
  projectedResourceId: string;
  items: ReactiveDiscoveryRouteCard[];
};

export type ReactiveDiscoveryRouteResponse = ReactiveDiscoveryRefinement;

type RankedCard<T> = {
  item: T;
  score: number;
  index: number;
};

type ReactiveEateryCardLike = Pick<
  GlobeEateryDiscoveryCard,
  "resourceId" | "shortLabel" | "priceLabel" | "distanceM" | "score100" | "detailReasonLine"
>;

type ReactiveLodgingCardLike = Pick<
  GlobeLodgingDiscoveryCard,
  "resourceId" | "shortLabel" | "priceKrw" | "distanceM" | "score100" | "detailReasonLine"
>;

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\s+/g, " ") : null;
}

function dedupeStrings(values: readonly (string | null | undefined)[], limit = 6): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    next.push(trimmed);
    if (next.length >= limit) {
      break;
    }
  }
  return next;
}

function reorderByResourceIds<T extends { resourceId: string }>(
  items: readonly T[],
  projectedResourceId: string,
  relatedResourceIds: readonly string[],
): T[] {
  const order = [projectedResourceId, ...relatedResourceIds];
  const seen = new Set(order);
  const byResourceId = new Map(items.map((item) => [item.resourceId, item] as const));
  const prioritized = order
    .map((resourceId) => byResourceId.get(resourceId) ?? null)
    .filter((item): item is T => item != null);
  const rest = items.filter((item) => !seen.has(item.resourceId));
  return [...prioritized, ...rest];
}

function mergeRelatedIds(
  baseIds: readonly string[],
  refinedIds: readonly string[] | null | undefined,
): string[] {
  if (!refinedIds?.length) {
    return [...baseIds];
  }
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const resourceId of [...refinedIds, ...baseIds]) {
    const trimmed = resourceId.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    merged.push(trimmed);
  }
  return merged;
}

function scoreDistanceSimilarity(
  left: number | null,
  right: number | null,
  tightM: number,
  looseM: number,
): number {
  if (left == null || right == null) {
    return 0;
  }
  const delta = Math.abs(left - right);
  if (delta <= tightM) {
    return 2;
  }
  if (delta <= looseM) {
    return 1;
  }
  return 0;
}

function pickRelatedIds<T extends { resourceId: string }>(ranked: readonly RankedCard<T>[]): string[] {
  const positive = ranked.filter((row) => row.score > 0);
  if (positive.length > 0) {
    return positive.slice(0, 3).map((row) => row.item.resourceId);
  }
  return ranked.slice(0, 2).map((row) => row.item.resourceId);
}

function buildCommonReactiveChips(input: {
  shortLabel: string;
  matchedPersonName: string | null;
  extraChips?: readonly (string | null | undefined)[];
}): string[] {
  return dedupeStrings([
    copy.globe.discoveryReactiveFocusChip(input.shortLabel),
    copy.globe.discoveryReactiveContextChip,
    input.matchedPersonName
      ? copy.globe.discoveryReactivePersonChip(input.matchedPersonName)
      : null,
    ...(input.extraChips ?? []),
  ]);
}

function buildEateryRankedCards(input: {
  items: readonly ReactiveEateryCardLike[];
  projected: ReactiveEateryCardLike;
  matchedPersonName: string | null;
}): RankedCard<ReactiveEateryCardLike>[] {
  const projectedPrice = normalizeText(input.projected.priceLabel);
  return input.items
    .map((item, index) => {
      if (item.resourceId === input.projected.resourceId) {
        return null;
      }
      let score = 0;
      if (normalizeText(item.priceLabel) === projectedPrice && projectedPrice) {
        score += 3;
      }
      if (item.shortLabel === input.projected.shortLabel) {
        score += 1;
      }
      score += scoreDistanceSimilarity(item.distanceM, input.projected.distanceM, 350, 900);
      if (Math.abs(item.score100 - input.projected.score100) <= 6) {
        score += 1;
      }
      if (
        input.matchedPersonName &&
        item.detailReasonLine.includes(input.matchedPersonName)
      ) {
        score += 1;
      }
      return { item, score, index };
    })
    .filter((row): row is RankedCard<ReactiveEateryCardLike> => row != null)
    .sort((left, right) => right.score - left.score || left.index - right.index);
}

function lodgingPriceBand(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  if (value < 90_000) {
    return 0;
  }
  if (value < 160_000) {
    return 1;
  }
  return 2;
}

function buildLodgingRankedCards(input: {
  items: readonly ReactiveLodgingCardLike[];
  projected: ReactiveLodgingCardLike;
  matchedPersonName: string | null;
}): RankedCard<ReactiveLodgingCardLike>[] {
  const projectedBand = lodgingPriceBand(input.projected.priceKrw);
  return input.items
    .map((item, index) => {
      if (item.resourceId === input.projected.resourceId) {
        return null;
      }
      let score = 0;
      const band = lodgingPriceBand(item.priceKrw);
      if (band != null && projectedBand != null) {
        const delta = Math.abs(band - projectedBand);
        if (delta === 0) {
          score += 3;
        } else if (delta === 1) {
          score += 1;
        }
      }
      if (item.shortLabel === input.projected.shortLabel) {
        score += 1;
      }
      score += scoreDistanceSimilarity(item.distanceM, input.projected.distanceM, 1200, 3200);
      if (Math.abs(item.score100 - input.projected.score100) <= 7) {
        score += 1;
      }
      if (
        input.matchedPersonName &&
        item.detailReasonLine.includes(input.matchedPersonName)
      ) {
        score += 1;
      }
      return { item, score, index };
    })
    .filter((row): row is RankedCard<ReactiveLodgingCardLike> => row != null)
    .sort((left, right) => right.score - left.score || left.index - right.index);
}

export function buildEateryReactiveDiscoveryRefinement(input: {
  items: readonly ReactiveEateryCardLike[];
  projectedResourceId: string;
  matchedPersonName: string | null;
}): ReactiveDiscoveryRefinement {
  const projected = input.items.find((item) => item.resourceId === input.projectedResourceId);
  if (!projected) {
    return { relatedResourceIds: [], signalChips: [], source: "rules" };
  }
  const ranked = buildEateryRankedCards({
    items: input.items,
    projected,
    matchedPersonName: input.matchedPersonName,
  });
  const relatedResourceIds = pickRelatedIds(ranked);
  const relatedItems = ranked
    .filter((row) => relatedResourceIds.includes(row.item.resourceId))
    .map((row) => row.item);
  const projectedPrice = normalizeText(projected.priceLabel);
  const hasTasteCluster = relatedItems.some(
    (item) => normalizeText(item.priceLabel) === projectedPrice && projectedPrice,
  );
  const hasNearbyCluster = relatedItems.some(
    (item) =>
      item.distanceM != null &&
      projected.distanceM != null &&
      Math.abs(item.distanceM - projected.distanceM) <= 900,
  );
  return {
    relatedResourceIds,
    signalChips: buildCommonReactiveChips({
      shortLabel: projected.shortLabel,
      matchedPersonName: input.matchedPersonName,
      extraChips: [
        hasTasteCluster ? copy.globe.eateryDiscoveryReactiveTasteChip : null,
        hasNearbyCluster ? copy.globe.discoveryReactiveNearbyChip : null,
      ],
    }),
    source: "rules",
  };
}

export function buildLodgingReactiveDiscoveryRefinement(input: {
  items: readonly ReactiveLodgingCardLike[];
  projectedResourceId: string;
  matchedPersonName: string | null;
}): ReactiveDiscoveryRefinement {
  const projected = input.items.find((item) => item.resourceId === input.projectedResourceId);
  if (!projected) {
    return { relatedResourceIds: [], signalChips: [], source: "rules" };
  }
  const ranked = buildLodgingRankedCards({
    items: input.items,
    projected,
    matchedPersonName: input.matchedPersonName,
  });
  const relatedResourceIds = pickRelatedIds(ranked);
  const relatedItems = ranked
    .filter((row) => relatedResourceIds.includes(row.item.resourceId))
    .map((row) => row.item);
  const projectedBand = lodgingPriceBand(projected.priceKrw);
  const hasPriceCluster = relatedItems.some(
    (item) =>
      projectedBand != null && lodgingPriceBand(item.priceKrw) === projectedBand,
  );
  const hasNearbyCluster = relatedItems.some(
    (item) =>
      item.distanceM != null &&
      projected.distanceM != null &&
      Math.abs(item.distanceM - projected.distanceM) <= 3200,
  );
  return {
    relatedResourceIds,
    signalChips: buildCommonReactiveChips({
      shortLabel: projected.shortLabel,
      matchedPersonName: input.matchedPersonName,
      extraChips: [
        hasPriceCluster ? copy.globe.lodgingDiscoveryReactivePriceChip : null,
        hasNearbyCluster ? copy.globe.discoveryReactiveNearbyChip : null,
      ],
    }),
    source: "rules",
  };
}

export function applyEateryReactiveDiscoverySession(input: {
  session: GlobeEateryDiscoverySession;
  projectedResourceId: string | null;
  refinement?: ReactiveDiscoveryRefinement | null;
}): GlobeEateryDiscoverySession {
  const projectedResourceId = input.projectedResourceId?.trim() ?? null;
  if (!projectedResourceId) {
    return input.session;
  }
  const base = buildEateryReactiveDiscoveryRefinement({
    items: input.session.items,
    projectedResourceId,
    matchedPersonName: input.session.matchedPersonName,
  });
  const relatedResourceIds = mergeRelatedIds(
    base.relatedResourceIds,
    input.refinement?.relatedResourceIds,
  );
  return {
    ...input.session,
    items: reorderByResourceIds(input.session.items, projectedResourceId, relatedResourceIds),
    signalChips: dedupeStrings([
      ...base.signalChips,
      ...(input.refinement?.signalChips ?? []),
      ...input.session.signalChips,
    ]),
  };
}

export function applyLodgingReactiveDiscoverySession(input: {
  session: GlobeLodgingDiscoverySession;
  projectedResourceId: string | null;
  refinement?: ReactiveDiscoveryRefinement | null;
}): GlobeLodgingDiscoverySession {
  const projectedResourceId = input.projectedResourceId?.trim() ?? null;
  if (!projectedResourceId) {
    return input.session;
  }
  const base = buildLodgingReactiveDiscoveryRefinement({
    items: input.session.items,
    projectedResourceId,
    matchedPersonName: input.session.matchedPersonName,
  });
  const relatedResourceIds = mergeRelatedIds(
    base.relatedResourceIds,
    input.refinement?.relatedResourceIds,
  );
  return {
    ...input.session,
    items: reorderByResourceIds(input.session.items, projectedResourceId, relatedResourceIds),
    signalChips: dedupeStrings([
      ...base.signalChips,
      ...(input.refinement?.signalChips ?? []),
      ...input.session.signalChips,
    ]),
  };
}

export function buildEateryReactiveDiscoveryRouteRequest(input: {
  session: GlobeEateryDiscoverySession;
  projectedResourceId: string;
  contextEvent: ReactiveDiscoveryContextEvent;
}): ReactiveDiscoveryRouteRequest {
  return {
    domain: "eatery",
    contextEvent: input.contextEvent,
    matchedPersonName: input.session.matchedPersonName,
    projectedResourceId: input.projectedResourceId,
    items: input.session.items.map((item) => ({
      resourceId: item.resourceId,
      title: item.title,
      shortLabel: item.shortLabel,
      detailReasonLine: item.detailReasonLine,
      score100: item.score100,
      distanceM: item.distanceM,
      priceLabel: item.priceLabel,
    })),
  };
}

export function buildLodgingReactiveDiscoveryRouteRequest(input: {
  session: GlobeLodgingDiscoverySession;
  projectedResourceId: string;
  contextEvent: ReactiveDiscoveryContextEvent;
}): ReactiveDiscoveryRouteRequest {
  return {
    domain: "lodging",
    contextEvent: input.contextEvent,
    matchedPersonName: input.session.matchedPersonName,
    projectedResourceId: input.projectedResourceId,
    items: input.session.items.map((item) => ({
      resourceId: item.resourceId,
      title: item.title,
      shortLabel: item.shortLabel,
      detailReasonLine: item.detailReasonLine,
      score100: item.score100,
      distanceM: item.distanceM,
      priceKrw: item.priceKrw,
    })),
  };
}
