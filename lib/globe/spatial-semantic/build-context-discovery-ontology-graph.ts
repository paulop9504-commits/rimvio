import { copy } from "@/lib/copy/human-ko";
import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { activitySubtypeNoun } from "@/lib/globe/place/activity-subtype-presentation";
import type {
  GeoOntologyEdge,
  GeoOntologyGraph,
  GeoOntologyNode,
} from "@/lib/globe/spatial-semantic/types";

function facetLabel(
  facetId: "distance" | "rating" | "price" | "vibe" | "category",
  spec: ContextConditionAnchorPinOutcome["spec"],
): string {
  switch (facetId) {
    case "distance":
      return copy.globe.geoOntologyFacetDistance(spec.transport);
    case "rating":
      return copy.globe.geoOntologyFacetRating;
    case "price":
      return copy.globe.geoOntologyFacetPrice(spec.budget);
    case "vibe":
      return copy.globe.geoOntologyFacetVibe(spec.vibe);
    case "category":
      return spec.activityFocus?.trim()
        ? copy.globe.geoOntologyFacetCategory(
            activitySubtypeNoun(spec.activitySubtype) ||
              spec.activityFocus.trim(),
          )
        : spec.eateryFocus?.trim()
          ? copy.globe.geoOntologyFacetCategory(spec.eateryFocus.trim())
          : copy.globe.geoOntologyFacetCategoryDefault;
    default:
      return facetId;
  }
}

/** Scout outcome → semantic graph (root · facets · places). */
export function buildContextDiscoveryOntologyGraph(input: {
  contextEventId: string;
  anchorPlaceName: string;
  outcome: ContextConditionAnchorPinOutcome;
}): GeoOntologyGraph {
  const contextEventId = input.contextEventId.trim();
  const anchor = input.anchorPlaceName.trim() || copy.globe.contextConditionPanelEyebrow;
  const spec = input.outcome.spec;
  const theme = (() => {
    if (spec.activityFocus?.trim() || spec.resourceTypes.includes("activity")) {
      return (
        activitySubtypeNoun(spec.activitySubtype) ||
        copy.globe.geoOntologyRootActivity
      );
    }
    if (spec.resourceTypes.includes("amenity")) {
      return copy.globe.geoOntologyRootAmenity;
    }
    if (spec.eateryFocus?.trim()) {
      return spec.eateryFocus.trim();
    }
    if (input.outcome.eateryCount > 0) {
      const anyActivity = input.outcome.recommendations.some(
        (row) => row.kind === "activity",
      );
      if (anyActivity) {
        return copy.globe.geoOntologyRootActivity;
      }
      return copy.globe.geoOntologyRootEatery;
    }
    return copy.globe.geoOntologyRootLodging;
  })();

  const nodes: GeoOntologyNode[] = [
    {
      id: "ctx",
      kind: "context",
      labelKo: copy.globe.geoOntologyContextChain(anchor, theme),
    },
    {
      id: "root",
      kind: "root",
      labelKo: theme,
    },
  ];
  const edges: GeoOntologyEdge[] = [
    { id: "e-ctx-root", fromId: "ctx", toId: "root" },
  ];

  const facetIds = ["category", "distance", "rating", "price", "vibe"] as const;
  for (const facetId of facetIds) {
    const id = `facet-${facetId}`;
    nodes.push({
      id,
      kind: "facet",
      facetId,
      labelKo: facetLabel(facetId, spec),
    });
    edges.push({ id: `e-root-${id}`, fromId: "root", toId: id });
  }

  for (const [index, row] of input.outcome.recommendations.entries()) {
    const placeNodeId = `place-${row.placeId}`;
    nodes.push({
      id: placeNodeId,
      kind: "place",
      labelKo: row.title,
      placeId: row.placeId,
      kindTag: row.kind,
    });
    edges.push({
      id: `e-root-${placeNodeId}`,
      fromId: "root",
      toId: placeNodeId,
    });
    const facetForReason =
      /가까|거리|도보/u.test(row.reasonKo) ? "facet-distance" : "facet-rating";
    edges.push({
      id: `e-${placeNodeId}-${facetForReason}`,
      fromId: placeNodeId,
      toId: facetForReason,
    });
    void index;
  }

  return {
    contextEventId,
    batchId: input.outcome.batchId,
    nodes,
    edges,
    atIso: new Date().toISOString(),
  };
}

/** CLARIFYING — intent chain before scout. */
export function buildClarifyingOntologyGraph(input: {
  contextEventId: string;
  anchorPlaceName: string;
  themeKo: string;
}): GeoOntologyGraph {
  const anchor = input.anchorPlaceName.trim() || copy.globe.contextConditionPanelEyebrow;
  const theme = input.themeKo.trim() || copy.globe.geoOntologyRootEatery;
  const nodes: GeoOntologyNode[] = [
    {
      id: "ctx",
      kind: "context",
      labelKo: copy.globe.geoOntologyContextChain(anchor, theme),
    },
    {
      id: "root",
      kind: "root",
      labelKo: theme,
    },
  ];
  return {
    contextEventId: input.contextEventId.trim(),
    batchId: null,
    nodes,
    edges: [{ id: "e-ctx-root", fromId: "ctx", toId: "root" }],
    atIso: new Date().toISOString(),
  };
}
