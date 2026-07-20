/**
 * Bridge — Field chip / UI → start Osaka 30s demo on Globe.
 */

export const OSAKA_30S_DEMO_EVENT = "rimvio:osaka-30s-demo";

export type Osaka30sDemoRequest = {
  readonly source?: "field_chip" | "globe" | "manual";
};

export function requestOsaka30sDemo(detail: Osaka30sDemoRequest = {}): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<Osaka30sDemoRequest>(OSAKA_30S_DEMO_EVENT, {
      detail: { source: detail.source ?? "manual" },
    }),
  );
}

export function subscribeOsaka30sDemo(
  listener: (detail: Osaka30sDemoRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<Osaka30sDemoRequest>).detail;
    listener({ source: detail?.source ?? "manual" });
  };
  window.addEventListener(OSAKA_30S_DEMO_EVENT, handler);
  return () => window.removeEventListener(OSAKA_30S_DEMO_EVENT, handler);
}
