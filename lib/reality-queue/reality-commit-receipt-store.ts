/**
 * Commit Receipt — evidence that Reality changed after L5 gate.
 * Session-scoped; not a second truth store.
 */

export type RealityCommitReceiptV1 = {
  readonly version: 1;
  readonly titleKo: string;
  readonly lines: readonly string[];
  readonly disclaimerKo: string | null;
  readonly contextEventId: string | null;
  readonly approvedPlanCount: number;
  readonly committedAtIso: string;
};

const EVENT_NAME = "rimvio-reality-commit-receipt";

let receipt: RealityCommitReceiptV1 | null = null;

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function readRealityCommitReceipt(): RealityCommitReceiptV1 | null {
  return receipt;
}

export function writeRealityCommitReceipt(next: RealityCommitReceiptV1): void {
  receipt = next;
  emit();
}

export function clearRealityCommitReceipt(): void {
  if (!receipt) {
    return;
  }
  receipt = null;
  emit();
}

export function subscribeRealityCommitReceipt(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

/** Globe pin pulse after Commit — map listens optionally. */
export const REALITY_COMMIT_PULSE_EVENT = "rimvio:reality-commit-pulse";

export type RealityCommitPulseDetail = {
  readonly contextEventId: string;
};

export function dispatchRealityCommitPulse(contextEventId: string): void {
  const id = contextEventId.trim();
  if (typeof window === "undefined" || !id) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<RealityCommitPulseDetail>(REALITY_COMMIT_PULSE_EVENT, {
      detail: { contextEventId: id },
    }),
  );
}

export function subscribeRealityCommitPulse(
  listener: (detail: RealityCommitPulseDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<RealityCommitPulseDetail>).detail;
    const id = detail?.contextEventId?.trim() ?? "";
    if (id) {
      listener({ contextEventId: id });
    }
  };
  window.addEventListener(REALITY_COMMIT_PULSE_EVENT, handler);
  return () => window.removeEventListener(REALITY_COMMIT_PULSE_EVENT, handler);
}
