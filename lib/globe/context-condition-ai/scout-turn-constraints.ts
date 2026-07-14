/**
 * Scout turn constraints — Intent Convergence (Cursor-style).
 *
 * Carry across turns: transport · budget · vibe · area · excludes (prefs).
 * Never revive prior dish on a re-search — dish/menu focus is THIS turn only
 * unless the utterance is a pure facet refine ("더 싸게", "걷기만").
 */
import type {
  LocalDiscoveryActionSpec,
  LocalDiscoveryBudget,
  LocalDiscoveryTransport,
  LocalDiscoveryVibe,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { UtteranceIntentSlots } from "@/lib/globe/context-condition-ai/utterance-intent-slots";
import { parseUtteranceIntentSlots } from "@/lib/globe/context-condition-ai/utterance-intent-slots";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { isInstantEaterySearch } from "@/lib/globe/context-condition-ai/instant-eatery-search";

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

const SEARCH_CUE =
  /주변|근처|찾|검색|추천|배치|다시\s*찾|재검색|nearby|search/iu;
/** Task/IR labels — never a facet refine that should revive prior dish. */
const TASK_IR_LABEL =
  /작업\s*:|목표\s*:|식사·맛집\s*맞추|단계별\s*실행/iu;

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

/**
 * True only for facet refine that must keep prior dish.
 * Re-search / instant eatery / new dish → false (this turn owns intent).
 */
export function shouldCarryPriorEateryFocus(message: string): boolean {
  const text = message.trim();
  if (!text) {
    return false;
  }
  const slots = parseUtteranceIntentSlots(text);
  if (slots.dishFocus?.trim() || slots.dessertOnly || slots.replaceDish) {
    return false;
  }
  if (isInstantEaterySearch(text) || TASK_IR_LABEL.test(text)) {
    return false;
  }
  // Same-context re-search ("맛집 찾아줘") — converge to THIS turn, drop prior dish.
  if (SEARCH_CUE.test(text) && hasEateryDomainCue(text)) {
    return false;
  }
  return true;
}

/** Merge prior prefs + new utterance. Dish focus converges to this turn on re-search. */
export function mergeScoutTurnConstraints(input: {
  prior: ScoutTurnConstraints | null;
  message: string;
  slots?: UtteranceIntentSlots | null;
  spec?: LocalDiscoveryActionSpec | null;
}): ScoutTurnConstraints {
  const slots = input.slots ?? parseUtteranceIntentSlots(input.message);
  const prior = input.prior ?? emptyScoutTurnConstraints();
  const spec = input.spec ?? null;
  const carryDish = shouldCarryPriorEateryFocus(input.message);

  let eateryFocus: string | null = carryDish ? prior.eateryFocus : null;
  let menuFocusId: string | null = carryDish ? prior.menuFocusId : null;

  if (slots.dessertOnly) {
    eateryFocus = "디저트";
    menuFocusId = "dessert";
  } else if (slots.dishFocus?.trim()) {
    eateryFocus = slots.dishFocus.trim();
    menuFocusId = slots.cuisineId;
  } else if (spec?.eateryFocus?.trim()) {
    eateryFocus = spec.eateryFocus.trim();
    // Spec may carry cuisine from this resolve — keep menu id only when still matching.
    if (!menuFocusId && prior.menuFocusId && prior.eateryFocus === eateryFocus) {
      menuFocusId = prior.menuFocusId;
    }
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

/**
 * Resolve dish focus for this turn.
 * Prior thread dish only when {@link shouldCarryPriorEateryFocus}.
 */
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
  const carryPrior = shouldCarryPriorEateryFocus(input.message);
  // This-turn chip query only — never a door for prior dish on re-search.
  if (carryPrior && input.menuFocusQuery?.trim()) {
    return input.menuFocusQuery.trim();
  }
  if (!carryPrior) {
    // Chip disambiguation on a fresh scout still passes menuFocusQuery this turn.
    return input.menuFocusQuery?.trim() || null;
  }
  if (input.prior?.eateryFocus?.trim()) {
    return input.prior.eateryFocus.trim();
  }
  return input.previousSpec?.eateryFocus?.trim() || null;
}
