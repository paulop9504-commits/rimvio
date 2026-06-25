/** Open Field dashboard sheet from globe home without full page navigation. */
export const FIELD_SHEET_OPEN_EVENT = "rimvio:field-sheet-open";

export function dispatchOpenFieldSheet(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(FIELD_SHEET_OPEN_EVENT));
}

export function subscribeOpenFieldSheet(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(FIELD_SHEET_OPEN_EVENT, listener);
  return () => window.removeEventListener(FIELD_SHEET_OPEN_EVENT, listener);
}
