/** Sync globe eatery markers ↔ discovery cards without coupling components. */

export const GLOBE_EATERY_FOCUS = "rimvio:globe-eatery-focus";

export type GlobeEateryFocusDetail = {
  resourceId: string;
  carouselIndex: number;
  source: "map_marker" | "discovery_card";
};

export function dispatchGlobeEateryFocus(detail: GlobeEateryFocusDetail): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeEateryFocusDetail>(GLOBE_EATERY_FOCUS, { detail }),
  );
}

export function subscribeGlobeEateryFocus(
  listener: (detail: GlobeEateryFocusDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeEateryFocusDetail>).detail;
    if (!detail?.resourceId) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_EATERY_FOCUS, handler);
  return () => window.removeEventListener(GLOBE_EATERY_FOCUS, handler);
}
