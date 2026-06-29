/** Sequential pin pop-in — shared by opportunity field + accommodation hub rail. */

export type StagedPinRevealItem = {
  id: string;
};

export type StagedPinRevealDetail = {
  id: string;
  index: number;
  total: number;
};

export type StagedPinRevealStartDetail = {
  ids: readonly string[];
  intervalMs?: number;
};

export const OPPORTUNITY_STAGED_PIN_REVEAL_START =
  "rimvio:opportunity-staged-pin-reveal-start";
export const OPPORTUNITY_STAGED_PIN_REVEAL_TICK =
  "rimvio:opportunity-staged-pin-reveal-tick";

const DEFAULT_INTERVAL_MS = 380;

export function dispatchStagedPinRevealStart(
  detail: StagedPinRevealStartDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<StagedPinRevealStartDetail>(OPPORTUNITY_STAGED_PIN_REVEAL_START, {
      detail,
    }),
  );
}

export function dispatchStagedPinRevealTick(detail: StagedPinRevealDetail): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<StagedPinRevealDetail>(OPPORTUNITY_STAGED_PIN_REVEAL_TICK, {
      detail,
    }),
  );
}

export function subscribeStagedPinRevealStart(
  listener: (detail: StagedPinRevealStartDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<StagedPinRevealStartDetail>).detail;
    if (!detail?.ids?.length) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(OPPORTUNITY_STAGED_PIN_REVEAL_START, handler);
  return () => window.removeEventListener(OPPORTUNITY_STAGED_PIN_REVEAL_START, handler);
}

export function subscribeStagedPinRevealTick(
  listener: (detail: StagedPinRevealDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<StagedPinRevealDetail>).detail);
  };
  window.addEventListener(OPPORTUNITY_STAGED_PIN_REVEAL_TICK, handler);
  return () => window.removeEventListener(OPPORTUNITY_STAGED_PIN_REVEAL_TICK, handler);
}

/** Reveal items one-by-one; dispatches opportunity-field bridge events. */
export function runStagedPinReveal(input: {
  items: readonly StagedPinRevealItem[];
  intervalMs?: number;
  onReveal?: (detail: StagedPinRevealDetail) => void;
}): () => void {
  const ids = input.items.map((row) => row.id).filter(Boolean);
  if (ids.length === 0 || typeof window === "undefined") {
    return () => {};
  }

  const intervalMs = input.intervalMs ?? DEFAULT_INTERVAL_MS;
  dispatchStagedPinRevealStart({ ids, intervalMs });

  let index = 0;
  const tick = () => {
    const id = ids[index];
    if (!id) {
      return;
    }
    const detail = { id, index, total: ids.length };
    dispatchStagedPinRevealTick(detail);
    input.onReveal?.(detail);
    index += 1;
    if (index >= ids.length) {
      window.clearInterval(timer);
    }
  };

  tick();
  const timer = window.setInterval(tick, intervalMs);
  return () => window.clearInterval(timer);
}
