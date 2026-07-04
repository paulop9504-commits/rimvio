"use client";

export const GLOBE_BRAIN_PROJECTION_REQUEST =
  "rimvio:globe-brain-projection-request";

export type GlobeBrainProjectionRequest = {
  anchorEventId: string;
};

export function dispatchGlobeBrainProjectionRequest(
  detail: GlobeBrainProjectionRequest,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeBrainProjectionRequest>(
      GLOBE_BRAIN_PROJECTION_REQUEST,
      { detail },
    ),
  );
}

export function subscribeGlobeBrainProjectionRequest(
  listener: (detail: GlobeBrainProjectionRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (
      event as CustomEvent<GlobeBrainProjectionRequest>
    ).detail;
    if (!detail?.anchorEventId?.trim()) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_BRAIN_PROJECTION_REQUEST, handler);
  return () =>
    window.removeEventListener(GLOBE_BRAIN_PROJECTION_REQUEST, handler);
}
