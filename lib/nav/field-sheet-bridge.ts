import type { FieldDashboardIngress } from "@/lib/nav/field-dashboard-types";

export type { FieldDashboardIngress, FieldDashboardTab } from "@/lib/nav/field-dashboard-types";

/** @alias FieldDashboardIngress — legacy name for sheet open events. */
export type FieldSheetOpenRequest = FieldDashboardIngress;

export const FIELD_SHEET_OPEN_EVENT = "rimvio:field-sheet-open";
export const FIELD_SHEET_STATE_EVENT = "rimvio:field-sheet-state";

export function dispatchOpenFieldSheet(request?: FieldSheetOpenRequest): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<FieldSheetOpenRequest>(FIELD_SHEET_OPEN_EVENT, {
      detail: request ?? {},
    }),
  );
}

export function subscribeOpenFieldSheet(
  listener: (request: FieldSheetOpenRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<FieldSheetOpenRequest>).detail ?? {});
  };
  window.addEventListener(FIELD_SHEET_OPEN_EVENT, handler);
  return () => window.removeEventListener(FIELD_SHEET_OPEN_EVENT, handler);
}

export function publishFieldSheetOpen(open: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(FIELD_SHEET_STATE_EVENT, { detail: { open } }),
  );
}

export function subscribeFieldSheetOpenState(
  listener: (open: boolean) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const open = (event as CustomEvent<{ open?: boolean }>).detail?.open === true;
    listener(open);
  };
  window.addEventListener(FIELD_SHEET_STATE_EVENT, handler);
  return () => window.removeEventListener(FIELD_SHEET_STATE_EVENT, handler);
}

export const FIELD_FLY_TO_INTENT_EVENT = "rimvio:field-fly-to-intent";

export function dispatchFieldFlyToIntent(record: import("@/lib/globe/market/market-intent-types").MarketIntentRecord): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(FIELD_FLY_TO_INTENT_EVENT, { detail: record }),
  );
}

export function subscribeFieldFlyToIntent(
  listener: (record: import("@/lib/globe/market/market-intent-types").MarketIntentRecord) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const record = (event as CustomEvent<import("@/lib/globe/market/market-intent-types").MarketIntentRecord>).detail;
    if (record?.eventId) {
      listener(record);
    }
  };
  window.addEventListener(FIELD_FLY_TO_INTENT_EVENT, handler);
  return () => window.removeEventListener(FIELD_FLY_TO_INTENT_EVENT, handler);
}
