import { isAlternatePlaceSearch } from "@/lib/globe/context-condition-ai/is-alternate-place-search";
import type {
  ContextConditionRecommendation,
  LocalDiscoveryActionSpec,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  buildSpatialPatchPreview,
  planSpatialPatch,
} from "@/lib/globe/context-condition-ai/plan-spatial-patch";
import { isLocalDiscoveryRefinement } from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
import type { SpatialPatchPlan } from "@/lib/globe/context-condition-ai/spatial-patch-types";
import type { GeoOntologyFacetId } from "@/lib/globe/spatial-semantic/types";

export type PalantirRefineIntent =
  | { kind: "alternate_scout" }
  | { kind: "facet_rerank"; facetId: GeoOntologyFacetId }
  | {
      kind: "spatial_patch";
      patchPlan: SpatialPatchPlan;
      nextSpec: LocalDiscoveryActionSpec;
      keptRecommendations: readonly ContextConditionRecommendation[];
    };

export function parsePalantirFacetFromMessage(message: string): GeoOntologyFacetId | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  if (/가까|근처|도보/u.test(text)) {
    return "distance";
  }
  if (/싸|가성|저렴|가격/u.test(text)) {
    return "price";
  }
  if (/평점|리뷰/u.test(text)) {
    return "rating";
  }
  if (/조용|분위기|로컬|인기|핫/u.test(text)) {
    return "vibe";
  }
  return null;
}

/** Chat refine → alternate scout · facet re-project · spatial patch. */
export function resolvePalantirRefineIntent(input: {
  message: string;
  currentSpec: LocalDiscoveryActionSpec;
  previousRecommendations: readonly ContextConditionRecommendation[];
  pinnedPlaceIds?: { lodging: string | null; eatery: string | null };
}): PalantirRefineIntent | null {
  const text = input.message.trim();
  if (!text || input.previousRecommendations.length === 0) {
    return null;
  }
  if (!isLocalDiscoveryRefinement(text)) {
    return null;
  }

  if (isAlternatePlaceSearch(text)) {
    return { kind: "alternate_scout" };
  }

  const facetId = parsePalantirFacetFromMessage(text);
  if (facetId) {
    return { kind: "facet_rerank", facetId };
  }

  const patchPlan = planSpatialPatch({
    message: text,
    currentSpec: input.currentSpec,
    previousRecommendations: input.previousRecommendations,
    pinnedPlaceIds: input.pinnedPlaceIds,
  });
  const preview = buildSpatialPatchPreview({
    plan: patchPlan,
    previousRecommendations: input.previousRecommendations,
    pinnedPlaceIds: input.pinnedPlaceIds,
  });

  return {
    kind: "spatial_patch",
    patchPlan,
    nextSpec: patchPlan.nextSpec,
    keptRecommendations: preview.kept,
  };
}

export function resolvePalantirExcludePlaceIds(input: {
  recommendations: readonly ContextConditionRecommendation[];
  projectedPlaceIds?: readonly string[];
}): string[] {
  const ids = new Set<string>();
  for (const row of input.recommendations) {
    ids.add(row.placeId);
  }
  for (const placeId of input.projectedPlaceIds ?? []) {
    const trimmed = placeId.trim();
    if (trimmed) {
      ids.add(trimmed);
    }
  }
  return [...ids];
}
