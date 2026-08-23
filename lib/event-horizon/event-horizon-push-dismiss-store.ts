const DISMISS_KEY = "rimvio:guardian:event-horizon-push-dismiss";

export function readEventHorizonPushDismissDateKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export function dismissEventHorizonPushForDate(dateKey: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(DISMISS_KEY, dateKey);
  } catch {
    /* noop */
  }
}

export function resetEventHorizonPushDismissForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    /* noop */
  }
}
