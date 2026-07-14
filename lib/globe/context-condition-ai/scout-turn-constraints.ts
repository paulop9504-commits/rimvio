/**
 * Turn-accumulated scout constraints — Cursor-like thread carry.
 * Free-text dish / excludes persist across follow-ups until replaced.
 */
import type {
  LocalDiscoveryActionSpec,
  LocalDiscoveryBudget,
  LocalDiscoveryTransport,
  LocalDiscoveryVibe,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { UtteranceIntentSlots } from "@/lib/globe/context-condition-ai/utterance-intent-slots";
import { parseUtteranceIntentSlots } from "@/lib/globe/context-condition-ai/utterance-intent-slots";

export type ScoutTurnConstraints = {
  readonly eateryFocus: string | null;
  readonly menuFocusId: string | null;
  readonly transport: LocalDiscoveryTransport | null;
  readonly budget: LocalDiscoveryBudget | null;
  readonly vibe: LocalDiscoveryVibe | null;
  readonly areaHint: string | null;
  readonly excludeKeywords: readonly string[];
  readonly updatedAtIso: string;
};

const STORAGE_PREFIX = "rimvio-scout-turn-constraints";

function storageKey(contextEventId: string): string {
  return `${STORAGE_PREFIX}:${contextEventId.trim()}`;
}

export function emptyScoutTurnConstraints(
  updatedAtIso = new Date().toISOString(),
): ScoutTurnConstraints {
  return {
    eateryFocus: null,
    menuFocusId: null,
    transport: null,
    budget: null,
    vibe: null,
    areaHint: null,
    excludeKeywords: [],
    updatedAtIso,
  };
}

export function readScoutTurnConstraints(
  contextEventId: string,
): ScoutTurnConstraints | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(storageKey(contextEventId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ScoutTurnConstraints;
  } catch {
    return null;
  }
}

export function writeScoutTurnConstraints(
  contextEventId: string,
  constraints: ScoutTurnConstraints,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(
      storageKey(contextEventId),
      JSON.stringify(constraints),
    );
  } catch {
    /* ignore */
  }
}

export function clearScoutTurnConstraints(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(storageKey(contextEventId));
  } catch {
    /* ignore */
  }
}

/** Merge prior thread + new utterance (+ optional ready spec) into next constraints. */
export function mergeScoutTurnConstraints(input: {
  prior: ScoutTurnConstraints | null;
  message: string;
  slots?: UtteranceIntentSlots | null;
  spec?: LocalDiscoveryActionSpec | null;
}): ScoutTurnConstraints {
  const slots = input.slots ?? parseUtteranceIntentSlots(input.message);
  const prior = input.prior ?? emptyScoutTurnConstraints();
  const spec = input.spec ?? null;

  let eateryFocus = prior.eateryFocus;
  let menuFocusId = prior.menuFocusId;

  if (slots.replaceDish || slots.dessertOnly || slots.dishFocus?.trim()) {
    if (slots.dessertOnly) {
      eateryFocus = "디저트";
      menuFocusId = "dessert";
    } else if (slots.dishFocus?.trim()) {
      eateryFocus = slots.dishFocus.trim();
      menuFocusId = slots.cuisineId;
    }
  } else if (spec?.eateryFocus?.trim()) {
    eateryFocus = spec.eateryFocus.trim();
  }

  const exclude = new Set([
    ...prior.excludeKeywords,
    ...slots.excludeKeywords,
  ]);

  return {
    eateryFocus,
    menuFocusId,
    transport: spec?.transport ?? prior.transport,
    budget: spec?.budget ?? prior.budget,
    vibe: spec?.vibe ?? prior.vibe,
    areaHint: slots.areaHint?.trim() || prior.areaHint,
    excludeKeywords: [...exclude],
    updatedAtIso: new Date().toISOString(),
  };
}

/** Resolve effective eatery focus for this turn (utterance wins, else thread). */
export function resolveAccumulatedEateryFocus(input: {
  message: string;
  prior: ScoutTurnConstraints | null;
  previousSpec?: LocalDiscoveryActionSpec | null;
  menuFocusQuery?: string | null;
}): string | null {
  const slots = parseUtteranceIntentSlots(input.message);
  if (slots.dishFocus?.trim()) {
    return slots.dishFocus.trim();
  }
  if (input.menuFocusQuery?.trim()) {
    return input.menuFocusQuery.trim();
  }
  if (input.prior?.eateryFocus?.trim()) {
    return input.prior.eateryFocus.trim();
  }
  return input.previousSpec?.eateryFocus?.trim() || null;
}
