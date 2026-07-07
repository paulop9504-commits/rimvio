/** Geo-Ontology Bridge — semantic nodes synced with Globe markers. */

export type GeoOntologyFacetId =
  | "distance"
  | "rating"
  | "price"
  | "vibe"
  | "category";

export type GeoOntologyNodeKind = "context" | "root" | "facet" | "place";

export type GeoOntologyNode = {
  readonly id: string;
  readonly kind: GeoOntologyNodeKind;
  readonly labelKo: string;
  readonly facetId?: GeoOntologyFacetId;
  readonly placeId?: string;
  readonly kindTag?: "lodging" | "eatery";
};

export type GeoOntologyEdge = {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
};

export type GeoOntologyGraph = {
  readonly contextEventId: string;
  readonly batchId: string | null;
  readonly nodes: readonly GeoOntologyNode[];
  readonly edges: readonly GeoOntologyEdge[];
  readonly atIso: string;
};

export type GeoOntologyFacetState = {
  readonly activeFacetId: GeoOntologyFacetId | null;
  readonly rankedPlaceIds: readonly string[];
  readonly highlightedPlaceId: string | null;
};
