import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";

export type GlobeEateryMarkerHandlers = {
  onPress: (resourceId: string, carouselIndex: number) => void;
};

/** Reuses lodging discovery pill styles — eatery map pins. */
export function createGlobeEateryMarkerElement(
  marker: GlobeEateryMapMarker,
  handlers: GlobeEateryMarkerHandlers,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "rimvio-globe-lodging-marker";
  root.dataset.globeEateryMarker = marker.resourceId;
  if (marker.isMain) {
    root.classList.add("rimvio-globe-lodging-marker--main");
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
    const name = document.createElement("span");
    name.className = "rimvio-globe-lodging-marker__discovery-name";
    name.textContent = marker.discoveryShortLabel;
    pill.appendChild(name);
    if (marker.discoveryPriceLabel) {
      const price = document.createElement("span");
      price.className = "rimvio-globe-lodging-marker__discovery-price";
      price.textContent = marker.discoveryPriceLabel;
      pill.appendChild(price);
    }
    root.appendChild(pill);
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

  const card = document.createElement("span");
  card.className = "rimvio-globe-lodging-marker__card";

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
    fallback.textContent = "맛";
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

  root.addEventListener("pointerdown", (event) => event.stopPropagation());
  root.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    handlers.onPress(marker.resourceId, marker.carouselIndex);
  });

  return root;
}
