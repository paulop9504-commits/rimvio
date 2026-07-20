/**
 * Apply ContextFieldPack → LocalDiscoveryActionSpec patch fields.
 */

import type {
  LocalDiscoveryActionSpec,
  LocalDiscoveryBudget,
  LocalDiscoveryTransport,
  LocalDiscoveryVibe,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type {
  ContextCompanion,
  ContextFieldHints,
  ContextFieldPack,
} from "@/lib/context-field/types";

export type DiscoveryFieldPatch = {
  readonly transport?: LocalDiscoveryTransport;
  readonly budget?: LocalDiscoveryBudget;
  readonly vibe?: LocalDiscoveryVibe;
  readonly maxNightlyPriceKrw?: number | null;
  readonly eateryFocus?: string | null;
  readonly companion?: ContextCompanion | null;
  readonly fieldHints?: ContextFieldHints | null;
};

function resolveVibe(pack: ContextFieldPack, previous?: LocalDiscoveryVibe | null): LocalDiscoveryVibe | undefined {
  // Mood quiet wins; else popularity local > hot > popular; else mood.
  if (pack.mood?.vibe === "quiet") {
    return "quiet";
  }
  if (pack.popularity?.vibe === "local" || pack.popularity?.localFavoriteOnly) {
    return "local";
  }
  if (pack.popularity?.vibe === "hot") {
    return "hot";
  }
  if (pack.popularity?.vibe === "popular") {
    return "popular";
  }
  if (pack.mood?.vibe) {
    return pack.mood.vibe;
  }
  // Soft crowd → quiet only when no stronger vibe was stated.
  if (pack.crowd?.value === "no_wait" && !previous) {
    return "quiet";
  }
  return undefined;
}

function buildFieldHints(pack: ContextFieldPack): ContextFieldHints | null {
  const hints: {
    weather?: "rain";
    crowd?: "no_wait";
    timeScope?: "today";
  } = {};
  if (pack.weather?.value === "rain") {
    hints.weather = "rain";
  }
  if (pack.crowd?.value === "no_wait") {
    hints.crowd = "no_wait";
  }
  if (pack.time?.value === "today") {
    hints.timeScope = "today";
  }
  return Object.keys(hints).length > 0 ? hints : null;
}

function resolveEateryFocus(pack: ContextFieldPack): string | null | undefined {
  if (pack.category?.label) {
    let label = pack.category.label;
    // Rain soft-hint: bias indoor / covered when category present.
    if (pack.weather?.value === "rain" && !/실내|indoor/iu.test(label)) {
      // Keep category label clean for search; rain lives in fieldHints.
    }
    return label;
  }
  return undefined;
}

/** Merge field pack onto discovery knobs (does not compose full spec). */
export function applyFieldsToDiscoverySpec(input: {
  pack: ContextFieldPack;
  previous?: LocalDiscoveryActionSpec | null;
}): DiscoveryFieldPatch {
  const { pack, previous } = input;
  const patch: {
    transport?: LocalDiscoveryTransport;
    budget?: LocalDiscoveryBudget;
    vibe?: LocalDiscoveryVibe;
    maxNightlyPriceKrw?: number | null;
    eateryFocus?: string | null;
    companion?: ContextCompanion | null;
    fieldHints?: ContextFieldHints | null;
  } = {};

  if (pack.transport?.value) {
    patch.transport = pack.transport.value;
  } else if (pack.distance?.closer) {
    patch.transport = "walk";
  } else if (pack.location?.nearHotel && !previous?.transport) {
    patch.transport = "walk";
  }

  const maxKrw = pack.price?.maxKrw ?? null;
  if (maxKrw != null) {
    patch.maxNightlyPriceKrw = maxKrw;
    patch.budget = "low";
  } else if (pack.budget?.softBudget) {
    patch.budget = pack.budget.softBudget;
  }

  const vibe = resolveVibe(pack, previous?.vibe);
  if (vibe) {
    patch.vibe = vibe;
  } else if (pack.crowd?.value === "no_wait" && previous?.vibe == null) {
    patch.vibe = "quiet";
  }

  const eateryFocus = resolveEateryFocus(pack);
  if (eateryFocus !== undefined) {
    patch.eateryFocus = eateryFocus;
  }

  if (pack.companion?.value) {
    patch.companion = pack.companion.value;
  }

  const hints = buildFieldHints(pack);
  if (hints) {
    patch.fieldHints = hints;
  }

  return patch;
}

/** Apply patch onto an existing composed-ready base (for refine). */
export function mergeDiscoveryFieldPatch(
  spec: LocalDiscoveryActionSpec,
  patch: DiscoveryFieldPatch,
): LocalDiscoveryActionSpec {
  return {
    ...spec,
    ...(patch.transport ? { transport: patch.transport } : {}),
    ...(patch.budget ? { budget: patch.budget } : {}),
    ...(patch.vibe ? { vibe: patch.vibe } : {}),
    ...(patch.maxNightlyPriceKrw != null && patch.maxNightlyPriceKrw > 0
      ? { maxNightlyPriceKrw: Math.round(patch.maxNightlyPriceKrw) }
      : {}),
    ...(patch.eateryFocus?.trim()
      ? { eateryFocus: patch.eateryFocus.trim() }
      : {}),
    ...(patch.companion ? { companion: patch.companion } : {}),
    ...(patch.fieldHints
      ? {
          fieldHints: {
            ...(spec.fieldHints ?? {}),
            ...patch.fieldHints,
          },
        }
      : {}),
    radiusM: patch.transport
      ? radiusForTransport(patch.transport)
      : spec.radiusM,
  };
}

function radiusForTransport(transport: LocalDiscoveryTransport): number {
  switch (transport) {
    case "walk":
      return 800;
    case "transit":
      return 1200;
    case "car":
      return 2000;
    default:
      return 800;
  }
}
