import { copy } from "@/lib/copy/human-ko";
import type {
  ContextConditionAnchorPinOutcome,
  ContextConditionRecommendation,
  LocalDiscoveryActionSpec,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  highlightGeoOntologyPlace,
  publishGeoOntologyFacetState,
} from "@/lib/globe/spatial-semantic/geo-ontology-graph-store";
import { rankPlacesByGeoOntologyFacet } from "@/lib/globe/spatial-semantic/apply-geo-ontology-facet";
import { publishFocusGlobeProjection } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import {
  recordPalantirOntologyHistory,
  type PalantirOntologyHistoryKind,
} from "@/lib/globe/spatial-semantic/palantir-ontology-history-store";
import { publishPalantirWorkspaceSnapshot } from "@/lib/globe/spatial-semantic/palantir-workspace-store";
import { resolvePalantirAutoFacet } from "@/lib/globe/spatial-semantic/resolve-palantir-auto-facet";
import type { GeoOntologyFacetId } from "@/lib/globe/spatial-semantic/types";

/** Palantir-style investigation workspace — AI owns sparse Globe projection. */

export type PalantirWorkspaceSnapshot = {
  contextEventId: string;
  batchId: string;
  primaryPlaceId: string | null;
  projectedPlaceIds: readonly string[];
  briefKo: string;
  provenanceKo: string;
  focusLabelKo: string | null;
  activeFacetId: GeoOntologyFacetId | null;
};

export function resolvePalantirProjectionCount(total: number): number {
  if (total <= 0) {
    return 0;
  }
  if (total === 1) {
    return 1;
  }
  if (total <= 4) {
    return 2;
  }
  return 3;
}

export function pickPalantirProjectedRecommendations(
  recommendations: readonly ContextConditionRecommendation[],
): ContextConditionRecommendation[] {
  const sorted = [...recommendations].sort((left, right) => left.rank - right.rank);
  return sorted.slice(0, resolvePalantirProjectionCount(sorted.length));
}

export function buildPalantirOperatorBrief(input: {
  projected: readonly ContextConditionRecommendation[];
  eateryFocus?: string | null;
}): string {
  const primary = input.projected[0];
  if (!primary) {
    return "";
  }
  const focus = input.eateryFocus?.trim() || copy.globe.geoOntologyRootEatery;
  const alts = input.projected.slice(1);
  const lead = copy.globe.palantirOperatorBriefPrimary(
    primary.title,
    primary.reasonKo.trim() || focus,
  );
  if (alts.length === 0) {
    return lead;
  }
  const altLine = copy.globe.palantirOperatorBriefAlternates(
    alts.map((row) => row.title).join(" · "),
  );
  return `${lead} ${altLine}`;
}

export function buildPalantirProvenanceLine(input: {
  radiusM: number;
  scoutCount: number;
  projectedCount: number;
}): string {
  return copy.globe.palantirOperatorProvenance(
    Math.round(input.radiusM),
    input.scoutCount,
    input.projectedCount,
  );
}

function rankRecommendationsByFacet(input: {
  facetId: GeoOntologyFacetId;
  recommendations: readonly ContextConditionRecommendation[];
}): ContextConditionRecommendation[] {
  const rankedIds = rankPlacesByGeoOntologyFacet({
    facetId: input.facetId,
    recommendations: input.recommendations,
  });
  return rankedIds
    .map((placeId) => input.recommendations.find((row) => row.placeId === placeId))
    .filter((row): row is ContextConditionRecommendation => Boolean(row));
}

/** Scout complete → auto-facet rank → operator projects top-N. */
export function applyPalantirOperatorAfterScout(input: {
  contextEventId: string;
  anchorPlaceName: string;
  triggerMessage?: string | null;
  outcome: Pick<
    ContextConditionAnchorPinOutcome,
    "batchId" | "radiusM" | "recommendations" | "spec"
  >;
}): PalantirWorkspaceSnapshot | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return null;
  }

  const autoFacetId = resolvePalantirAutoFacet({
    triggerMessage: input.triggerMessage,
    spec: input.outcome.spec,
  });
  const ranked = rankRecommendationsByFacet({
    facetId: autoFacetId,
    recommendations: input.outcome.recommendations,
  });
  const projected = pickPalantirProjectedRecommendations(
    ranked.length > 0 ? ranked : input.outcome.recommendations,
  );
  if (projected.length === 0) {
    return null;
  }

  return publishPalantirProjection({
    contextEventId,
    batchId: input.outcome.batchId,
    recommendations: input.outcome.recommendations,
    projected,
    briefKo: buildPalantirOperatorBrief({
      projected,
      eateryFocus: input.outcome.spec.eateryFocus,
    }),
    provenanceKo: buildPalantirProvenanceLine({
      radiusM: input.outcome.radiusM,
      scoutCount: input.outcome.recommendations.length,
      projectedCount: projected.length,
    }),
    focusLabelKo: input.outcome.spec.eateryFocus?.trim() || null,
    activeFacetId: autoFacetId,
    historyKind: "scout",
  });
}

function facetLabelKo(facetId: GeoOntologyFacetId): string {
  switch (facetId) {
    case "distance":
      return copy.globe.geoOntologyFacetDistance("walk");
    case "price":
      return copy.globe.geoOntologyFacetPrice("medium");
    case "rating":
      return copy.globe.geoOntologyFacetRating;
    case "vibe":
      return copy.globe.geoOntologyFacetVibe("popular");
    case "category":
    default:
      return copy.globe.geoOntologyFacetCategoryDefault;
  }
}

function publishPalantirProjection(input: {
  contextEventId: string;
  batchId: string;
  recommendations: readonly ContextConditionRecommendation[];
  projected: readonly ContextConditionRecommendation[];
  briefKo: string;
  provenanceKo: string;
  focusLabelKo: string | null;
  activeFacetId?: GeoOntologyFacetId | null;
  historyKind: PalantirOntologyHistoryKind;
}): PalantirWorkspaceSnapshot {
  const projectedPlaceIds = input.projected.map((row) => row.placeId);
  const primary = input.projected[0]!;

  publishFocusGlobeProjection({
    contextEventId: input.contextEventId,
    visiblePlaceIds: projectedPlaceIds,
  });
  publishGeoOntologyFacetState({
    contextEventId: input.contextEventId,
    activeFacetId: input.activeFacetId ?? null,
    rankedPlaceIds: input.recommendations.map((row) => row.placeId),
    highlightedPlaceId: primary.placeId,
  });
  highlightGeoOntologyPlace({
    contextEventId: input.contextEventId,
    placeId: primary.placeId,
  });

  const snapshot: PalantirWorkspaceSnapshot = {
    contextEventId: input.contextEventId,
    batchId: input.batchId,
    primaryPlaceId: primary.placeId,
    projectedPlaceIds,
    briefKo: input.briefKo,
    provenanceKo: input.provenanceKo,
    focusLabelKo: input.focusLabelKo,
    activeFacetId: input.activeFacetId ?? null,
  };
  publishPalantirWorkspaceSnapshot(snapshot);
  recordPalantirOntologyHistory({
    contextEventId: input.contextEventId,
    kind: input.historyKind,
    labelKo: input.briefKo,
    workspace: snapshot,
  });
  return snapshot;
}

/** Facet refine — re-rank existing scout pool, no new search. */
export function applyPalantirOperatorFacetRefine(input: {
  contextEventId: string;
  facetId: GeoOntologyFacetId;
  recommendations: readonly ContextConditionRecommendation[];
  spec: LocalDiscoveryActionSpec;
  radiusM: number;
  batchId?: string | null;
}): PalantirWorkspaceSnapshot | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId || input.recommendations.length === 0) {
    return null;
  }

  const rankedIds = rankPlacesByGeoOntologyFacet({
    facetId: input.facetId,
    recommendations: input.recommendations,
  });
  const ranked = rankedIds
    .map((placeId) => input.recommendations.find((row) => row.placeId === placeId))
    .filter((row): row is ContextConditionRecommendation => Boolean(row));
  const projected = pickPalantirProjectedRecommendations(ranked);
  if (projected.length === 0) {
    return null;
  }

  return publishPalantirProjection({
    contextEventId,
    batchId: input.batchId?.trim() || "facet-refine",
    recommendations: input.recommendations,
    projected,
    briefKo: copy.globe.palantirOperatorFacetBrief(
      facetLabelKo(input.facetId),
      projected[0]!.title,
      projected
        .slice(1)
        .map((row) => row.title)
        .join(" · "),
    ),
    provenanceKo: buildPalantirProvenanceLine({
      radiusM: input.radiusM,
      scoutCount: input.recommendations.length,
      projectedCount: projected.length,
    }),
    focusLabelKo: input.spec.eateryFocus?.trim() || null,
    activeFacetId: input.facetId,
    historyKind: "facet_refine",
  });
}

export function applyPalantirOperatorPlaceOverride(input: {
  contextEventId: string;
  placeId: string;
  recommendations: readonly ContextConditionRecommendation[];
}): PalantirWorkspaceSnapshot | null {
  const contextEventId = input.contextEventId.trim();
  const placeId = input.placeId.trim();
  if (!contextEventId || !placeId) {
    return null;
  }
  const row = input.recommendations.find((item) => item.placeId === placeId);
  if (!row) {
    return null;
  }

  publishFocusGlobeProjection({
    contextEventId,
    visiblePlaceIds: [placeId],
  });
  highlightGeoOntologyPlace({ contextEventId, placeId });

  const snapshot: PalantirWorkspaceSnapshot = {
    contextEventId,
    batchId: "",
    primaryPlaceId: placeId,
    projectedPlaceIds: [placeId],
    briefKo: copy.globe.palantirOperatorBriefPrimary(
      row.title,
      row.reasonKo.trim() || row.title,
    ),
    provenanceKo: "",
    focusLabelKo: null,
    activeFacetId: null,
  };
  publishPalantirWorkspaceSnapshot(snapshot);
  recordPalantirOntologyHistory({
    contextEventId,
    kind: "place_override",
    labelKo: snapshot.briefKo,
    workspace: snapshot,
  });
  return snapshot;
}
