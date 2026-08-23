const DISMISS_KEY = "rimvio:morning:prep-dismiss-date";

export function readMorningPrepDismissDateKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export function dismissMorningPrepForDate(dateKey: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(DISMISS_KEY, dateKey);
  } catch {
    /* noop */
  }
}

export function resetMorningPrepDismissStoreForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    /* noop */
  }
}
