import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";

const STORAGE_KEY = "rimvio-market-align-nudge.v1";
const SESSION_DISMISS_KEY = "rimvio-market-align-dismissed";

const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const SCORE_RESHOW_DELTA = 0.1;
const MIN_NUDGE_SCORE = 0.72;

type IntentNudgeRow = {
  lastNudgeAtIso: string;
  lastNudgeScore: number;
};

export type MarketAlignmentNudgeState = {
  dismissedUntil: Record<string, string>;
  intents: Record<string, IntentNudgeRow>;
};

function emptyState(): MarketAlignmentNudgeState {
  return { dismissedUntil: {}, intents: {} };
}

function readState(): MarketAlignmentNudgeState {
  if (typeof window === "undefined") {
    return emptyState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState();
    }
    const parsed = JSON.parse(raw) as MarketAlignmentNudgeState;
    return {
      dismissedUntil:
        parsed.dismissedUntil && typeof parsed.dismissedUntil === "object"
          ? parsed.dismissedUntil
          : {},
      intents: parsed.intents && typeof parsed.intents === "object" ? parsed.intents : {},
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: MarketAlignmentNudgeState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

export function resolveMarketAlignmentDismissKey(offer: MarketAlignmentOffer): string {
  return (
    offer.handshakeId ??
    offer.matchIntentServerId ??
    offer.matchIntentId
  );
}

function readSessionDismissedKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return sessionStorage.getItem(SESSION_DISMISS_KEY);
  } catch {
    return null;
  }
}

export function dismissMarketAlignmentSession(offer: MarketAlignmentOffer): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, resolveMarketAlignmentDismissKey(offer));
  } catch {
    // ignore
  }
}

export function evaluateMarketAlignmentNudge(input: {
  offer: MarketAlignmentOffer;
  state: MarketAlignmentNudgeState;
  sessionDismissedKey: string | null;
  now: Date;
}): boolean {
  const score = input.offer.alignmentScore ?? 0;
  if (score < MIN_NUDGE_SCORE) {
    return false;
  }

  const dismissKey = resolveMarketAlignmentDismissKey(input.offer);
  if (input.sessionDismissedKey === dismissKey) {
    return false;
  }

  const snoozeUntil = input.state.dismissedUntil[dismissKey];
  if (snoozeUntil && new Date(snoozeUntil) > input.now) {
    return false;
  }

  const selfKey = input.offer.selfEventId.trim();
  const row = input.state.intents[selfKey];
  if (row?.lastNudgeAtIso) {
    const elapsed = input.now.getTime() - new Date(row.lastNudgeAtIso).getTime();
    if (elapsed < NUDGE_COOLDOWN_MS && score < row.lastNudgeScore + SCORE_RESHOW_DELTA) {
      return false;
    }
  }

  return true;
}

export function shouldShowMarketAlignmentNudge(input: {
  offer: MarketAlignmentOffer;
  now?: Date;
}): boolean {
  return evaluateMarketAlignmentNudge({
    offer: input.offer,
    state: readState(),
    sessionDismissedKey: readSessionDismissedKey(),
    now: input.now ?? new Date(),
  });
}

export function recordMarketAlignmentNudgeShown(input: {
  offer: MarketAlignmentOffer;
  now?: Date;
}): void {
  const now = input.now ?? new Date();
  const state = readState();
  const selfKey = input.offer.selfEventId.trim();
  state.intents[selfKey] = {
    lastNudgeAtIso: now.toISOString(),
    lastNudgeScore: input.offer.alignmentScore ?? 0,
  };
  writeState(state);
}

export function recordMarketAlignmentNudgeDismissed(input: {
  offer: MarketAlignmentOffer;
  now?: Date;
}): void {
  const now = input.now ?? new Date();
  dismissMarketAlignmentSession(input.offer);
  const state = readState();
  const dismissKey = resolveMarketAlignmentDismissKey(input.offer);
  state.dismissedUntil[dismissKey] = new Date(now.getTime() + SNOOZE_MS).toISOString();
  writeState(state);
}

export function resetMarketAlignmentNudgePolicyForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_DISMISS_KEY);
}
