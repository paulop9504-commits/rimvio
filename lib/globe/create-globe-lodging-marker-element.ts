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

function attachLodgingMarkerDot(root: HTMLElement): void {
  const dot = document.createElement("span");
  dot.className = "rimvio-globe-lodging-marker__dot";
  root.appendChild(dot);
}

function bindLodgingMarkerPress(
  root: HTMLElement,
  marker: GlobeLodgingMapMarker,
  handlers: GlobeLodgingMarkerHandlers,
): void {
  root.addEventListener("pointerdown", (event) => event.stopPropagation());
  root.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    handlers.onPress(marker.resourceId, marker.carouselIndex);
  });
}

function appendLodgingOperationSignalBadge(
  root: HTMLElement,
  marker: GlobeLodgingMapMarker,
): void {
  const label = marker.operationSignalLabel?.trim();
  if (!label) {
    return;
  }
  const badge = document.createElement("span");
  badge.className = "rimvio-globe-lodging-marker__operation-signal";
  if (marker.operationSignalTone) {
    badge.dataset.operationSignalTone = marker.operationSignalTone;
  }
  if (marker.operationSignalPulse) {
    badge.dataset.operationSignalPulse = "true";
  }
  badge.textContent = label;
  root.appendChild(badge);
}

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

  if (marker.displayVariant === "price_pill") {
    root.classList.add("rimvio-globe-lodging-marker--price-pill");
    if (marker.isMain) {
      root.classList.add("rimvio-globe-lodging-marker--price-pill-main");
    }
    const shell = document.createElement("span");
    shell.className = "rimvio-globe-lodging-marker__price-pill-shell";
    const pill = document.createElement("span");
    pill.className = "rimvio-globe-lodging-marker__price-pill";
    pill.textContent =
      marker.discoveryPriceLabel?.trim() ||
      marker.mapHintLine?.trim() ||
      marker.label.trim().slice(0, 12);
    shell.appendChild(pill);
    const hint = marker.mapHintLine?.trim();
    if (hint && hint !== pill.textContent) {
      const line = document.createElement("span");
      line.className = "rimvio-globe-lodging-marker__price-pill-hint";
      line.textContent = hint;
      shell.appendChild(line);
    }
    root.appendChild(shell);
    attachLodgingMarkerDot(root);
    appendLodgingOperationSignalBadge(root, marker);
    bindLodgingMarkerPress(root, marker, handlers);
    return root;
  }

  if (marker.displayVariant === "preview_chip") {
    root.classList.add("rimvio-globe-lodging-marker--preview-chip");
    if (marker.isMain) {
      root.classList.add("rimvio-globe-lodging-marker--preview-chip-main");
    }
    const card = document.createElement("span");
    card.className = "rimvio-globe-lodging-marker__preview-chip";
    const thumbUrl = marker.thumbnailUrl?.trim();
    if (thumbUrl) {
      const image = document.createElement("img");
      image.src = thumbUrl;
      image.alt = "";
      image.className = "rimvio-globe-lodging-marker__preview-chip-thumb";
      image.draggable = false;
      card.appendChild(image);
    }
    const line = document.createElement("span");
    line.className = "rimvio-globe-lodging-marker__preview-chip-line";
    line.textContent = marker.mapHintLine?.trim() || marker.label;
    card.appendChild(line);
    if (marker.discoveryPriceLabel?.trim()) {
      const price = document.createElement("span");
      price.className = "rimvio-globe-lodging-marker__preview-chip-price";
      price.textContent = marker.discoveryPriceLabel.trim();
      card.appendChild(price);
    }
    root.appendChild(card);
    attachLodgingMarkerDot(root);
    appendLodgingOperationSignalBadge(root, marker);
    bindLodgingMarkerPress(root, marker, handlers);
    return root;
  }

  if (marker.displayVariant === "reason_chip") {
    root.classList.add("rimvio-globe-lodging-marker--reason-chip");
    if (marker.isMain) {
      root.classList.add("rimvio-globe-lodging-marker--reason-chip-main");
    }
    const chip = document.createElement("span");
    chip.className = "rimvio-globe-lodging-marker__reason-chip";
    chip.textContent = marker.mapHintLine?.trim() || marker.label;
    root.appendChild(chip);
    attachLodgingMarkerDot(root);
    appendLodgingOperationSignalBadge(root, marker);
    bindLodgingMarkerPress(root, marker, handlers);
    return root;
  }

  if (marker.displayVariant === "map_node") {
    root.classList.add("rimvio-globe-lodging-marker--map-node");
    if (marker.discoveryAccent) {
      root.dataset.discoveryAccent = marker.discoveryAccent;
    }
    const shell = document.createElement("span");
    shell.className = "rimvio-globe-lodging-marker__map-node-shell";
    const thumbUrl = marker.thumbnailUrl?.trim();
    if (thumbUrl) {
      const image = document.createElement("img");
      image.src = thumbUrl;
      image.alt = "";
      image.className = "rimvio-globe-lodging-marker__map-node-thumb";
      image.draggable = false;
      shell.appendChild(image);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "rimvio-globe-lodging-marker__map-node-fallback";
      fallback.textContent = "숙";
      shell.appendChild(fallback);
    }
    const name = document.createElement("span");
    name.className = "rimvio-globe-lodging-marker__map-node-label";
    name.textContent = marker.label;
    shell.appendChild(name);
    root.appendChild(shell);
    const dot = document.createElement("span");
    dot.className = "rimvio-globe-lodging-marker__dot";
    root.appendChild(dot);
    appendLodgingOperationSignalBadge(root, marker);
    root.addEventListener("pointerdown", (event) => event.stopPropagation());
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      handlers.onPress(marker.resourceId, marker.carouselIndex);
    });
    return root;
  }

  if (marker.contextConditionPin) {
    root.classList.add("rimvio-globe-lodging-marker--context-condition");
  }
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
    appendLodgingOperationSignalBadge(root, marker);
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
    appendLodgingOperationSignalBadge(root, marker);
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

  appendLodgingOperationSignalBadge(root, marker);
  return root;
}
