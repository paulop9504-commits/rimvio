import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import { bindGlobeMapMarkerPress } from "@/lib/globe/bind-globe-map-marker-press";
import { mountRealityObjectMarkerVisual } from "@/lib/visual-projection";

export type GlobeEateryMarkerHandlers = {
  onPress: (resourceId: string, carouselIndex: number) => void;
  detailLevel?: GlobeDetailLevel | null;
};

/** Floating Reality Object pin — LOD glyph → label → cover + object halo. */
export function createGlobeEateryMarkerElement(
  marker: GlobeEateryMapMarker,
  handlers: GlobeEateryMarkerHandlers,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "rimvio-globe-lodging-marker rimvio-globe-lodging-marker--discovery";
  root.dataset.globeEateryMarker = marker.resourceId;
  if (marker.virtualCandidate) {
    root.dataset.virtualCandidate = "true";
  }
  if (marker.isMain) {
    root.classList.add("rimvio-globe-lodging-marker--main");
  }
  if (marker.popInDelayMs != null && marker.popInDelayMs >= 0) {
    root.classList.add("rimvio-globe-lodging-marker--popin");
    root.style.animationDelay = `${marker.popInDelayMs}ms`;
  }
  if (marker.contextConditionPin) {
    root.classList.add("rimvio-globe-lodging-marker--context-condition");
  }
  root.setAttribute(
    "aria-label",
    marker.anchorLabel
      ? `${marker.anchorLabel}에 연결된 ${marker.label}`
      : marker.label,
  );

  const isActivity = marker.resourceId.includes(":activity:");
  mountRealityObjectMarkerVisual({
    root,
    detailLevel: handlers.detailLevel,
    pinKind: isActivity ? "activity" : "eatery",
    label: marker.label,
    shortLabel: marker.discoveryShortLabel,
    thumbnailUrl: marker.thumbnailUrl,
    objectGlyph: marker.objectGlyph,
    objectHaloFamily: marker.objectHaloFamily,
    projectionTier: marker.projectionTier,
    discoveryAccent: marker.discoveryAccent,
    bloomRole: marker.bloomRole,
    bloomDelayMs: marker.bloomDelayMs,
    useSegmentation: marker.useSegmentation,
    cutoutMode: marker.cutoutMode,
  });

  const support = marker.discoveryPriceLabel?.trim();
  if (support && (handlers.detailLevel === "street" || handlers.detailLevel === "pin")) {
    const price = document.createElement("span");
    price.className = "rimvio-globe-reality-object__support";
    price.textContent = support;
    root.querySelector(".rimvio-globe-reality-object__shell")?.appendChild(price);
  }

  bindGlobeMapMarkerPress(root, () => {
    handlers.onPress(marker.resourceId, marker.carouselIndex);
  });

  return root;
}
