import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { GeoOntologyFacetId } from "@/lib/globe/spatial-semantic/types";

/** Re-rank scout places when a semantic facet node is selected. */
export function rankPlacesByGeoOntologyFacet(input: {
  facetId: GeoOntologyFacetId;
  recommendations: readonly ContextConditionRecommendation[];
}): string[] {
  const rows = [...input.recommendations];
  switch (input.facetId) {
    case "distance":
      return rows
        .slice()
        .sort((a, b) => {
          const aNear = /가까|근처|도보/u.test(a.reasonKo) ? 1 : 0;
          const bNear = /가까|근처|도보/u.test(b.reasonKo) ? 1 : 0;
          return bNear - aNear || a.rank - b.rank;
        })
        .map((row) => row.placeId);
    case "rating":
      return rows
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((row) => row.placeId);
    case "price":
      return rows
        .slice()
        .sort((a, b) => {
          const aValue = /싸|가성|저렴/u.test(a.reasonKo) ? 1 : 0;
          const bValue = /싸|가성|저렴/u.test(b.reasonKo) ? 1 : 0;
          return bValue - aValue || a.rank - b.rank;
        })
        .map((row) => row.placeId);
    case "vibe":
    case "category":
    default:
      return rows.map((row) => row.placeId);
  }
}
