/**
 * Focus Globe composer — search/capture absorbed into home prompt (no capture sheet chrome).
 * Legacy name `dispatchOpenCaptureSheet` kept for call-site stability.
 */

import { isPrimaryNavGlobePath } from "@/lib/surface-registry/rimvio-surface-ia";

export const CAPTURE_SHEET_OPEN_EVENT = "rimvio:capture-sheet-open";
export const FOCUS_GLOBE_COMPOSER_EVENT = "rimvio:focus-globe-composer";
export const GLOBE_COMPOSER_SEED_STORAGE_KEY = "rimvio:globe-composer-seed";

export type CaptureSheetOpenDetail = {
  seedText?: string;
  source?: "composer" | "manual" | "coach";
};

export type FocusGlobeComposerDetail = CaptureSheetOpenDetail;

let pendingSeedText: string | null = null;

function persistSeed(seed: string | null): void {
  pendingSeedText = seed;
  if (typeof window === "undefined") return;
  try {
    if (seed) {
      sessionStorage.setItem(GLOBE_COMPOSER_SEED_STORAGE_KEY, seed);
    } else {
      sessionStorage.removeItem(GLOBE_COMPOSER_SEED_STORAGE_KEY);
    }
  } catch {
    /* private mode */
  }
}

export function consumeCaptureSheetSeedText(): string | null {
  let fromMemory = pendingSeedText;
  pendingSeedText = null;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(GLOBE_COMPOSER_SEED_STORAGE_KEY);
      if (stored?.trim()) {
        fromMemory = fromMemory || stored.trim();
      }
      sessionStorage.removeItem(GLOBE_COMPOSER_SEED_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return fromMemory?.trim() || null;
}

export function dispatchOpenCaptureSheet(detail?: CaptureSheetOpenDetail): void {
  dispatchFocusGlobeComposer(detail);
}

export function dispatchFocusGlobeComposer(
  detail?: FocusGlobeComposerDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const seed = detail?.seedText?.trim() || null;
  persistSeed(seed);
  const payload = detail ?? {};
  window.dispatchEvent(
    new CustomEvent<FocusGlobeComposerDetail>(FOCUS_GLOBE_COMPOSER_EVENT, {
      detail: payload,
    }),
  );
  window.dispatchEvent(
    new CustomEvent<CaptureSheetOpenDetail>(CAPTURE_SHEET_OPEN_EVENT, {
      detail: payload,
    }),
  );

  const path = window.location.pathname || "/";
  if (!isPrimaryNavGlobePath(path)) {
    window.location.assign("/");
  }
}

export function subscribeOpenCaptureSheet(
  listener: (detail: CaptureSheetOpenDetail | null) => void,
): () => void {
  return subscribeFocusGlobeComposer(listener);
}

export function subscribeFocusGlobeComposer(
  listener: (detail: FocusGlobeComposerDetail | null) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail =
      (event as CustomEvent<FocusGlobeComposerDetail>).detail ?? null;
    listener(detail);
  };
  window.addEventListener(FOCUS_GLOBE_COMPOSER_EVENT, handler);
  window.addEventListener(CAPTURE_SHEET_OPEN_EVENT, handler);
  return () => {
    window.removeEventListener(FOCUS_GLOBE_COMPOSER_EVENT, handler);
    window.removeEventListener(CAPTURE_SHEET_OPEN_EVENT, handler);
  };
}

export const CAPTURE_SHEET_STATE_EVENT = "rimvio:capture-sheet-state";

let captureSheetOpen = false;

export function publishCaptureSheetOpen(open: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  if (captureSheetOpen === open) {
    return;
  }
  captureSheetOpen = open;
  window.dispatchEvent(
    new CustomEvent<{ open: boolean }>(CAPTURE_SHEET_STATE_EVENT, {
      detail: { open },
    }),
  );
}

export function readCaptureSheetOpen(): boolean {
  return false;
}

export function subscribeCaptureSheetOpen(
  listener: (open: boolean) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  listener(false);
  const handler = (event: Event) => {
    listener((event as CustomEvent<{ open: boolean }>).detail?.open ?? false);
  };
  window.addEventListener(CAPTURE_SHEET_STATE_EVENT, handler);
  return () => window.removeEventListener(CAPTURE_SHEET_STATE_EVENT, handler);
}
