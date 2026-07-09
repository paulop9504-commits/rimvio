import type { HubPgPendingFinalize } from "@/lib/globe/hub-checkout/pg/types";

const STORAGE_KEY = "rimvio.hub-pg-pending";

export function writeHubPgPendingFinalize(row: HubPgPendingFinalize): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(row));
}

export function readHubPgPendingFinalize(): HubPgPendingFinalize | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as HubPgPendingFinalize;
  } catch {
    return null;
  }
}

export function clearHubPgPendingFinalize(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}
