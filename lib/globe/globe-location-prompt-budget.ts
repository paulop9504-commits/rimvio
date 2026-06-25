const STORAGE_KEY = "rimvio.globe-location-prompt-budget.v1";

type GlobeLocationPromptBudgetState = {
  /** Local calendar day when we last surfaced an interactive location prompt. */
  offeredDayKey: string | null;
  offeredAtIso: string | null;
};

let memoryState: GlobeLocationPromptBudgetState = {
  offeredDayKey: null,
  offeredAtIso: null,
};

function localDayKey(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) {
    return localDayKey(null);
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function readState(): GlobeLocationPromptBudgetState {
  if (typeof window === "undefined") {
    return { ...memoryState };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { offeredDayKey: null, offeredAtIso: null };
    }
    const parsed = JSON.parse(raw) as GlobeLocationPromptBudgetState;
    return {
      offeredDayKey: parsed.offeredDayKey ?? null,
      offeredAtIso: parsed.offeredAtIso ?? null,
    };
  } catch {
    return { offeredDayKey: null, offeredAtIso: null };
  }
}

function writeState(state: GlobeLocationPromptBudgetState) {
  memoryState = state;
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function resetGlobeLocationPromptBudgetForTests(
  state: GlobeLocationPromptBudgetState = {
    offeredDayKey: null,
    offeredAtIso: null,
  },
) {
  memoryState = state;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/** Max one interactive location prompt per local calendar day. */
export function canOfferGlobeLocationPrompt(now = new Date()): boolean {
  const state = readState();
  const today = localDayKey(now.toISOString());
  return state.offeredDayKey !== today;
}

export function markGlobeLocationPromptOffered(now = new Date()): void {
  const today = localDayKey(now.toISOString());
  writeState({
    offeredDayKey: today,
    offeredAtIso: now.toISOString(),
  });
}

export function readGlobeLocationPromptBudgetForDebug(): GlobeLocationPromptBudgetState {
  return readState();
}
