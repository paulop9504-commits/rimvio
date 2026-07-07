import type {
  GeoOntologyFacetId,
  GeoOntologyFacetState,
  GeoOntologyGraph,
} from "@/lib/globe/spatial-semantic/types";

const GRAPH_EVENT = "rimvio-geo-ontology-graph";
const FACET_EVENT = "rimvio-geo-ontology-facet";

const graphs = new Map<string, GeoOntologyGraph>();
const facetByEvent = new Map<string, GeoOntologyFacetState>();

const DEFAULT_FACET: GeoOntologyFacetState = {
  activeFacetId: null,
  rankedPlaceIds: [],
  highlightedPlaceId: null,
};

function emitGraph(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ contextEventId: string }>(GRAPH_EVENT, {
      detail: { contextEventId },
    }),
  );
}

function emitFacet(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ contextEventId: string }>(FACET_EVENT, {
      detail: { contextEventId },
    }),
  );
}

export function readGeoOntologyGraph(
  contextEventId: string,
): GeoOntologyGraph | null {
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  return graphs.get(id) ?? null;
}

export function publishGeoOntologyGraph(graph: GeoOntologyGraph): void {
  const id = graph.contextEventId.trim();
  if (!id) {
    return;
  }
  graphs.set(id, graph);
  facetByEvent.set(id, {
    activeFacetId: null,
    rankedPlaceIds: graph.nodes
      .filter((node) => node.kind === "place" && node.placeId)
      .map((node) => node.placeId!),
    highlightedPlaceId: null,
  });
  emitGraph(id);
  emitFacet(id);
}

export function clearGeoOntologyGraph(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  graphs.delete(id);
  facetByEvent.delete(id);
  emitGraph(id);
  emitFacet(id);
}

export function readGeoOntologyFacetState(
  contextEventId: string,
): GeoOntologyFacetState {
  const id = contextEventId.trim();
  if (!id) {
    return DEFAULT_FACET;
  }
  return facetByEvent.get(id) ?? DEFAULT_FACET;
}

export function publishGeoOntologyFacetState(input: {
  contextEventId: string;
  activeFacetId: GeoOntologyFacetId | null;
  rankedPlaceIds: readonly string[];
  highlightedPlaceId?: string | null;
}): void {
  const id = input.contextEventId.trim();
  if (!id) {
    return;
  }
  facetByEvent.set(id, {
    activeFacetId: input.activeFacetId,
    rankedPlaceIds: [...input.rankedPlaceIds],
    highlightedPlaceId: input.highlightedPlaceId ?? null,
  });
  emitFacet(id);
}

export function highlightGeoOntologyPlace(input: {
  contextEventId: string;
  placeId: string | null;
}): void {
  const id = input.contextEventId.trim();
  if (!id) {
    return;
  }
  const current = facetByEvent.get(id) ?? DEFAULT_FACET;
  facetByEvent.set(id, {
    ...current,
    highlightedPlaceId: input.placeId?.trim() || null,
  });
  emitFacet(id);
}

export function subscribeGeoOntologyGraph(
  listener: (contextEventId: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<{ contextEventId: string }>).detail.contextEventId);
  };
  window.addEventListener(GRAPH_EVENT, handler);
  return () => window.removeEventListener(GRAPH_EVENT, handler);
}

export function subscribeGeoOntologyFacetState(
  listener: (contextEventId: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<{ contextEventId: string }>).detail.contextEventId);
  };
  window.addEventListener(FACET_EVENT, handler);
  return () => window.removeEventListener(FACET_EVENT, handler);
}
