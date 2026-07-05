import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import {
  mountGlobeMapCalloutPill,
  prependGlobeDiscoveryPillThumbnail,
  readGlobeMapCalloutOffset,
} from "@/lib/globe/globe-map-callout-element";
import { sanitizeMapMarkerSupportLabel } from "@/lib/globe/resolve-context-resource-map-markers";

export type GlobeLodgingMarkerHandlers = {
  onPress: (resourceId: string, carouselIndex: number) => void;
};

export function createGlobeLodgingMarkerElement(
  marker: GlobeLodgingMapMarker,
  handlers: GlobeLodgingMarkerHandlers,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "rimvio-globe-lodging-marker";
  root.dataset.globeLodgingMarker = marker.resourceId;
  if (marker.isMain) {
    root.classList.add("rimvio-globe-lodging-marker--main");
  }
  if (marker.displayVariant === "situational_label") {
    root.classList.add("rimvio-globe-lodging-marker--situational");
  }
  if (marker.popInDelayMs != null && marker.popInDelayMs >= 0) {
    root.classList.add("rimvio-globe-lodging-marker--popin");
    root.style.animationDelay = `${marker.popInDelayMs}ms`;
  }
  root.setAttribute("aria-label", marker.label);

  if (marker.discoveryShortLabel) {
    root.classList.add("rimvio-globe-lodging-marker--discovery");
    if (marker.discoveryAccent) {
      root.dataset.discoveryAccent = marker.discoveryAccent;
    }
    const pill = document.createElement("span");
    pill.className = "rimvio-globe-lodging-marker__discovery-pill";
    if (marker.virtualCandidate) {
      pill.style.border = "1px dashed rgba(15, 23, 42, 0.28)";
    }
    const thumbUrl = marker.thumbnailUrl?.trim();
    if (thumbUrl) {
      prependGlobeDiscoveryPillThumbnail(pill, {
        thumbnailUrl: thumbUrl,
        fallbackGlyph: "숙",
      });
    }
    const badgeLabel = marker.ontologyBadgeLabel?.trim();
    if (
      badgeLabel &&
      badgeLabel !== "숙소" &&
      !/노드$/u.test(badgeLabel)
    ) {
      const badge = document.createElement("span");
      badge.className = "rimvio-globe-lodging-marker__ontology-badge";
      badge.textContent = badgeLabel;
      pill.appendChild(badge);
    }
    const name = document.createElement("span");
    name.className = "rimvio-globe-lodging-marker__discovery-name";
    name.textContent = marker.discoveryShortLabel ?? marker.label;
    pill.appendChild(name);
    if (marker.stayBadgeLabel) {
      const stay = document.createElement("span");
      stay.className = "rimvio-globe-lodging-marker__stay-badge";
      stay.textContent = marker.stayBadgeLabel;
      pill.appendChild(stay);
    }
    const priceLabel = sanitizeMapMarkerSupportLabel(marker.discoveryPriceLabel);
    if (priceLabel) {
      const price = document.createElement("span");
      price.className = "rimvio-globe-lodging-marker__discovery-price";
      price.textContent = priceLabel;
      pill.appendChild(price);
    }
    const callout = readGlobeMapCalloutOffset(marker);
    if (callout) {
      mountGlobeMapCalloutPill(root, pill, callout);
    } else {
      root.appendChild(pill);
    }
    const dot = document.createElement("span");
    dot.className = "rimvio-globe-lodging-marker__dot";
    root.appendChild(dot);
    root.addEventListener("pointerdown", (event) => event.stopPropagation());
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      handlers.onPress(marker.resourceId, marker.carouselIndex);
    });
    return root;
  }

  if (marker.displayVariant === "situational_label") {
    const pill = document.createElement("span");
    pill.className = "rimvio-globe-lodging-marker__situational-pill";
    pill.textContent = marker.label;
    root.appendChild(pill);

    const dot = document.createElement("span");
    dot.className = "rimvio-globe-lodging-marker__dot";
    root.appendChild(dot);

    root.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      handlers.onPress(marker.resourceId, marker.carouselIndex);
    });
    return root;
  }

  const card = document.createElement("span");
  card.className = "rimvio-globe-lodging-marker__card";
  if (marker.virtualCandidate) {
    card.style.outline = "1px dashed rgba(255,255,255,0.42)";
  }

  if (marker.thumbnailUrl) {
    const image = document.createElement("img");
    image.src = marker.thumbnailUrl;
    image.alt = "";
    image.className = "rimvio-globe-lodging-marker__thumb";
    image.draggable = false;
    card.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "rimvio-globe-lodging-marker__fallback";
    fallback.textContent = "숙";
    card.appendChild(fallback);
  }

  const title = document.createElement("span");
  title.className = "rimvio-globe-lodging-marker__title";
  title.textContent = marker.label;

  root.appendChild(card);
  root.appendChild(title);
  const dot = document.createElement("span");
  dot.className = "rimvio-globe-lodging-marker__dot";
  root.appendChild(dot);

  root.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  root.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    handlers.onPress(marker.resourceId, marker.carouselIndex);
  });

  return root;
}
