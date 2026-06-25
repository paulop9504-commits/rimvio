"use client";

export const GLOBE_ASK_BRIDGE_FOCUS = "rimvio:globe-ask-bridge-focus";

export type GlobeAskBridgeFocusMode = "photos" | "map" | "bridge";

export type GlobeAskBridgeFocusDetail = {
  eventId: string;
  mode?: GlobeAskBridgeFocusMode;
};

/** Ask sheet context card → globe home (photos · map · bridge). */
export function requestGlobeAskBridgeFocus(
  eventId: string,
  mode: GlobeAskBridgeFocusMode = "bridge",
): void {
  const key = eventId.trim();
  if (typeof window === "undefined" || !key) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeAskBridgeFocusDetail>(GLOBE_ASK_BRIDGE_FOCUS, {
      detail: { eventId: key, mode },
    }),
  );
}

export function subscribeGlobeAskBridgeFocus(
  handler: (detail: GlobeAskBridgeFocusDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<GlobeAskBridgeFocusDetail>).detail;
    const eventId = detail?.eventId?.trim() ?? "";
    if (eventId) {
      handler({ eventId, mode: detail?.mode ?? "bridge" });
    }
  };
  window.addEventListener(GLOBE_ASK_BRIDGE_FOCUS, listener);
  return () => window.removeEventListener(GLOBE_ASK_BRIDGE_FOCUS, listener);
}
