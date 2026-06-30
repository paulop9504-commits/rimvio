/** Open the global + capture sheet from any surface (globe composer, coach, etc.). */
export const CAPTURE_SHEET_OPEN_EVENT = "rimvio:capture-sheet-open";

export type CaptureSheetOpenDetail = {
  /** Pre-fill and auto-send first turn (e.g. globe map composer handoff). */
  seedText?: string;
  source?: "composer" | "manual" | "coach";
};

let pendingSeedText: string | null = null;

export function dispatchOpenCaptureSheet(detail?: CaptureSheetOpenDetail): void {
  if (typeof window === "undefined") {
    return;
  }
  pendingSeedText = detail?.seedText?.trim() || null;
  window.dispatchEvent(
    new CustomEvent<CaptureSheetOpenDetail>(CAPTURE_SHEET_OPEN_EVENT, {
      detail: detail ?? {},
    }),
  );
}

/** Consume one-shot seed after the sheet opens. */
export function consumeCaptureSheetSeedText(): string | null {
  const seed = pendingSeedText;
  pendingSeedText = null;
  return seed;
}

export function subscribeOpenCaptureSheet(
  listener: (detail: CaptureSheetOpenDetail | null) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<CaptureSheetOpenDetail>).detail ?? null;
    listener(detail);
  };
  window.addEventListener(CAPTURE_SHEET_OPEN_EVENT, handler);
  return () => window.removeEventListener(CAPTURE_SHEET_OPEN_EVENT, handler);
}
