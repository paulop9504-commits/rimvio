export type GlobeTouchedContextDetail = {
  eventId: string | null;
  placeLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type GlobeContextConditionPanelDetail = {
  open: boolean;
  eventId?: string | null;
};

const GLOBE_TOUCHED_CONTEXT_EVENT = "rimvio-globe-touched-context";
const GLOBE_CONTEXT_CONDITION_PANEL_EVENT = "rimvio-globe-context-condition-panel";

let touchedContext: GlobeTouchedContextDetail = { eventId: null };
let panelOpen = false;

export function publishGlobeTouchedContext(detail: GlobeTouchedContextDetail): void {
  touchedContext = {
    eventId: detail.eventId?.trim() || null,
    placeLabel: detail.placeLabel?.trim() || null,
    lat: detail.lat ?? null,
    lng: detail.lng ?? null,
  };
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<GlobeTouchedContextDetail>(GLOBE_TOUCHED_CONTEXT_EVENT, {
        detail: touchedContext,
      }),
    );
  }
}

export function readGlobeTouchedContext(): GlobeTouchedContextDetail {
  return touchedContext;
}

export function readGlobeTouchedContextEventId(): string | null {
  return touchedContext.eventId;
}

export function isGlobeContextConditionPanelOpen(): boolean {
  return panelOpen;
}

function emitPanel(open: boolean, eventId?: string | null) {
  panelOpen = open;
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeContextConditionPanelDetail>(
      GLOBE_CONTEXT_CONDITION_PANEL_EVENT,
      {
        detail: { open, eventId: eventId ?? touchedContext.eventId },
      },
    ),
  );
}

export function openGlobeContextConditionPanel(eventId?: string | null): void {
  emitPanel(true, eventId);
}

export function closeGlobeContextConditionPanel(): void {
  emitPanel(false);
}

export function toggleGlobeContextConditionPanel(eventId?: string | null): boolean {
  const next = !panelOpen;
  emitPanel(next, eventId);
  return next;
}

export function subscribeGlobeTouchedContext(
  listener: (detail: GlobeTouchedContextDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeTouchedContextDetail>).detail);
  };
  window.addEventListener(GLOBE_TOUCHED_CONTEXT_EVENT, handler);
  return () => window.removeEventListener(GLOBE_TOUCHED_CONTEXT_EVENT, handler);
}

export function subscribeGlobeContextConditionPanel(
  listener: (detail: GlobeContextConditionPanelDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeContextConditionPanelDetail>).detail);
  };
  window.addEventListener(GLOBE_CONTEXT_CONDITION_PANEL_EVENT, handler);
  return () =>
    window.removeEventListener(GLOBE_CONTEXT_CONDITION_PANEL_EVENT, handler);
}
