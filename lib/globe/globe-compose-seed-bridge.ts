/**
 * One-shot seed for Globe chat composer (Field empty chips → 지구).
 * Mirrors capture-sheet seed: store pending text, open chat, consume once.
 */

export const GLOBE_COMPOSE_SEED_EVENT = "rimvio:globe-compose-seed";

export type GlobeComposeSeedDetail = {
  readonly text: string;
  readonly source?: "reality_queue_example" | "manual";
};

let pendingSeedText: string | null = null;

export function requestGlobeComposeSeed(detail: GlobeComposeSeedDetail): void {
  const text = detail.text.trim();
  if (typeof window === "undefined" || !text) {
    return;
  }
  pendingSeedText = text;
  window.dispatchEvent(
    new CustomEvent<GlobeComposeSeedDetail>(GLOBE_COMPOSE_SEED_EVENT, {
      detail: { text, source: detail.source ?? "manual" },
    }),
  );
}

/** Consume one-shot seed after chat opens. */
export function consumeGlobeComposeSeedText(): string | null {
  const seed = pendingSeedText;
  pendingSeedText = null;
  return seed;
}

export function peekGlobeComposeSeedText(): string | null {
  return pendingSeedText;
}

export function subscribeGlobeComposeSeed(
  listener: (detail: GlobeComposeSeedDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeComposeSeedDetail>).detail;
    const text = detail?.text?.trim() ?? "";
    if (text) {
      listener({ text, source: detail?.source ?? "manual" });
    }
  };
  window.addEventListener(GLOBE_COMPOSE_SEED_EVENT, handler);
  return () => window.removeEventListener(GLOBE_COMPOSE_SEED_EVENT, handler);
}
