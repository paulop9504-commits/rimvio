export const GLANGO_OPEN_GOOGLE_SHEET = "glango-open-google-sheet";

export type OpenGoogleSheetDetail = {
  url: string;
  title?: string;
};

/** Client-only — opens the sheets embed panel from chat @ turns. */
export function emitOpenGoogleSheet(detail: OpenGoogleSheetDetail): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<OpenGoogleSheetDetail>(GLANGO_OPEN_GOOGLE_SHEET, { detail }),
  );
}

export function subscribeOpenGoogleSheet(
  handler: (detail: OpenGoogleSheetDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<OpenGoogleSheetDetail>).detail;
    if (detail?.url) {
      handler(detail);
    }
  };
  window.addEventListener(GLANGO_OPEN_GOOGLE_SHEET, listener);
  return () => window.removeEventListener(GLANGO_OPEN_GOOGLE_SHEET, listener);
}
