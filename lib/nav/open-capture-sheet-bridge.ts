/** Open the global + capture sheet from any surface (globe empty, coach, etc.). */
export const CAPTURE_SHEET_OPEN_EVENT = "rimvio:capture-sheet-open";

export function dispatchOpenCaptureSheet(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(CAPTURE_SHEET_OPEN_EVENT));
}

export function subscribeOpenCaptureSheet(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(CAPTURE_SHEET_OPEN_EVENT, listener);
  return () => window.removeEventListener(CAPTURE_SHEET_OPEN_EVENT, listener);
}
