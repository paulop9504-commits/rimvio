/** After AI place find — open resource reel + brain orbit without a Maps tab UI. */

import { dispatchGlobeResourceReelFocus } from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
import { buildResourceReelResourceId } from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
import type { GlobeResourceReelKind } from "@/lib/globe/resource-reel/types";

export const GLOBE_PLACE_ONTOLOGY_FOCUS = "rimvio:globe-place-ontology-focus";

export type GlobePlaceOntologyFocusDetail = {
  contextEventId: string;
  placeId: string;
  kind: GlobeResourceReelKind;
  lat: number;
  lng: number;
  title: string;
  /** Prefer detail surface so confirmation → resources feels continuous. */
  surface?: "list" | "detail";
};

export function dispatchGlobePlaceOntologyFocus(
  detail: GlobePlaceOntologyFocusDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const contextEventId = detail.contextEventId.trim();
  const placeId = detail.placeId.trim();
  if (!contextEventId || !placeId) {
    return;
  }
  const kind = detail.kind;
  const resourceId = buildResourceReelResourceId({
    contextEventId,
    kind,
    placeId,
  });
  dispatchGlobeResourceReelFocus({
    contextEventId,
    resourceId,
    kind,
    surface: detail.surface ?? "detail",
    source: "map_marker",
  });
  window.dispatchEvent(
    new CustomEvent<GlobePlaceOntologyFocusDetail>(GLOBE_PLACE_ONTOLOGY_FOCUS, {
      detail: {
        ...detail,
        contextEventId,
        placeId,
        surface: detail.surface ?? "detail",
      },
    }),
  );
}

export function subscribeGlobePlaceOntologyFocus(
  listener: (detail: GlobePlaceOntologyFocusDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobePlaceOntologyFocusDetail>).detail);
  };
  window.addEventListener(GLOBE_PLACE_ONTOLOGY_FOCUS, handler);
  return () => window.removeEventListener(GLOBE_PLACE_ONTOLOGY_FOCUS, handler);
}

export function recommendationKindToReelKind(
  kind: "lodging" | "eatery" | "activity" | "amenity",
): GlobeResourceReelKind {
  return kind;
}
