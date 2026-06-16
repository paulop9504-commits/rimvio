/** Sync globe lodging markers ↔ hub carousel without coupling components. */

export const GLOBE_LODGING_FOCUS = "rimvio:globe-lodging-focus";

export type GlobeLodgingFocusDetail = {
  resourceId: string;
  carouselIndex: number;
  /** map_marker opens full focus stage; carousel/strip sync markers only. */
  source?: "map_marker" | "carousel" | "strip";
};

export function dispatchGlobeLodgingFocus(detail: GlobeLodgingFocusDetail): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeLodgingFocusDetail>(GLOBE_LODGING_FOCUS, { detail }),
  );
}

export function subscribeGlobeLodgingFocus(
  listener: (detail: GlobeLodgingFocusDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeLodgingFocusDetail>).detail;
    if (!detail?.resourceId) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_LODGING_FOCUS, handler);
  return () => window.removeEventListener(GLOBE_LODGING_FOCUS, handler);
}
