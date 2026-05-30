const LEGACY_STORAGE_KEY = "glang.gesture-coach.v1";
const STORAGE_KEY = "glango.gesture-coach.v1";

export function hasSeenGestureCoach(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return localStorage.getItem(STORAGE_KEY) === "1" || localStorage.getItem(LEGACY_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markGestureCoachSeen(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}
