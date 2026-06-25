const STORAGE_KEY = "rimvio-portal-market-suggest.v1";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

type PortalMarketSuggestionState = {
  dismissedUntil: Record<string, string>;
};

function emptyState(): PortalMarketSuggestionState {
  return { dismissedUntil: {} };
}

function readState(): PortalMarketSuggestionState {
  if (typeof window === "undefined") {
    return emptyState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState();
    }
    const parsed = JSON.parse(raw) as PortalMarketSuggestionState;
    return {
      dismissedUntil:
        parsed.dismissedUntil && typeof parsed.dismissedUntil === "object"
          ? parsed.dismissedUntil
          : {},
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: PortalMarketSuggestionState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

export function shouldShowPortalMarketSuggestion(input: {
  eventId: string;
  now?: Date;
}): boolean {
  const key = input.eventId.trim();
  if (!key) {
    return false;
  }
  const until = readState().dismissedUntil[key];
  if (!until) {
    return true;
  }
  return new Date(until) <= (input.now ?? new Date());
}

export function dismissPortalMarketSuggestion(input: {
  eventId: string;
  now?: Date;
}): void {
  const key = input.eventId.trim();
  if (!key) {
    return;
  }
  const now = input.now ?? new Date();
  const state = readState();
  state.dismissedUntil[key] = new Date(now.getTime() + SNOOZE_MS).toISOString();
  writeState(state);
}

export function resetPortalMarketSuggestionPolicyForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
