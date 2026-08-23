const FIRST_UNLOCK_KEY = "rimvio:morning:first-unlock-date";

export function readFirstUnlockDateKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(FIRST_UNLOCK_KEY);
  } catch {
    return null;
  }
}

/** Mark today as unlocked; returns true only on the first unlock of the date. */
export function consumeFirstUnlockToday(dateKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const stored = window.localStorage.getItem(FIRST_UNLOCK_KEY);
    if (stored === dateKey) {
      return false;
    }
    window.localStorage.setItem(FIRST_UNLOCK_KEY, dateKey);
    return true;
  } catch {
    return false;
  }
}

export function resetFirstUnlockStoreForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(FIRST_UNLOCK_KEY);
  } catch {
    /* noop */
  }
}
