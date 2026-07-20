import { isAlternatePlaceSearch } from "@/lib/globe/context-condition-ai/is-alternate-place-search";
import type {
  ContextConditionRecommendation,
  LocalDiscoveryActionSpec,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import {
  buildSpatialPatchPreview,
  planSpatialPatch,
} from "@/lib/globe/context-condition-ai/plan-spatial-patch";
import { isLocalDiscoveryRefinement } from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
import type { SpatialPatchPlan } from "@/lib/globe/context-condition-ai/spatial-patch-types";
import type { GeoOntologyFacetId } from "@/lib/globe/spatial-semantic/types";
import {
  contextFieldsRequireSpatialPatch,
  parseContextFields,
} from "@/lib/context-field";

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
  // Soft price language without a hard nightly ceiling → facet re-rank only.
  if (/싸|가성|저렴|가격/u.test(text) && parseMaxNightlyPriceKrw(text) == null) {
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

function buildSpatialPatchIntent(input: {
  message: string;
  currentSpec: LocalDiscoveryActionSpec;
  previousRecommendations: readonly ContextConditionRecommendation[];
  pinnedPlaceIds?: { lodging: string | null; eatery: string | null };
}): Extract<PalantirRefineIntent, { kind: "spatial_patch" }> {
  const patchPlan = planSpatialPatch({
    message: input.message,
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

  // Hard nightly cap / 「N만원대로 다시 찾아」 → re-fetch + map reproject.
  if (parseMaxNightlyPriceKrw(text) != null) {
    return buildSpatialPatchIntent(input);
  }

  // Hard Context Fields (distance minutes · local+category) → spatial_patch.
  if (contextFieldsRequireSpatialPatch(parseContextFields(text))) {
    return buildSpatialPatchIntent(input);
  }

  if (isAlternatePlaceSearch(text)) {
    return { kind: "alternate_scout" };
  }

  // 「다시 찾아」 with soft budget language also re-scouts lodging.
  if (
    /다시\s*찾/iu.test(text) &&
    /싸|저렴|가격|budget|cheap|만\s*원/iu.test(text)
  ) {
    return buildSpatialPatchIntent(input);
  }

  const facetId = parsePalantirFacetFromMessage(text);
  if (facetId) {
    return { kind: "facet_rerank", facetId };
  }

  return buildSpatialPatchIntent(input);
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
