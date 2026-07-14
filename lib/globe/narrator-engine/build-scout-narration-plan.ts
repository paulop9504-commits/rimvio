import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ScoutTurnConstraints } from "@/lib/globe/context-condition-ai/scout-turn-constraints";
import { shouldCarryPriorEateryFocus } from "@/lib/globe/context-condition-ai/scout-turn-constraints";
import { parseUtteranceIntentSlots } from "@/lib/globe/context-condition-ai/utterance-intent-slots";
import type {
  ScoutNarrationDomain,
  ScoutNarrationMode,
  ScoutNarrationPlan,
} from "@/lib/globe/narrator-engine/types";

function domainFromSpec(spec: LocalDiscoveryActionSpec): ScoutNarrationDomain {
  const types = spec.resourceTypes;
  const hasEatery = types.includes("restaurant");
  const hasLodging = types.includes("hotel");
  const hasActivity = types.includes("activity");
  const hasAmenity = types.includes("amenity");
  const n =
    Number(hasEatery) + Number(hasLodging) + Number(hasActivity) + Number(hasAmenity);
  if (n > 1) {
    return "Mixed";
  }
  if (hasEatery) {
    return "Eatery";
  }
  if (hasLodging) {
    return "Lodging";
  }
  if (hasActivity) {
    return "Activity";
  }
  if (hasAmenity) {
    return "Amenity";
  }
  return "Unknown";
}

function normalizeFocusLabel(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  // Prefer short user nouns in Narrator copy.
  if (/초밥|스시|sushi/iu.test(trimmed)) {
    return "초밥";
  }
  if (/말차|matcha|抹茶/iu.test(trimmed)) {
    return "말차";
  }
  if (/라멘|ramen|ラーメン/iu.test(trimmed)) {
    return "라멘";
  }
  return trimmed;
}

function focusChanged(
  prior: string | null | undefined,
  next: string | null | undefined,
): boolean {
  const a = prior?.trim().toLowerCase() ?? "";
  const b = next?.trim().toLowerCase() ?? "";
  if (!a || !b) {
    return Boolean(a) !== Boolean(b);
  }
  return a !== b;
}

export function buildScoutNarrationPlan(input: {
  message: string;
  spec: LocalDiscoveryActionSpec;
  priorConstraints?: ScoutTurnConstraints | null;
  previousSpec?: LocalDiscoveryActionSpec | null;
  anchorLabelKo?: string | null;
}): ScoutNarrationPlan {
  const slots = parseUtteranceIntentSlots(input.message);
  const nextFocus =
    normalizeFocusLabel(input.spec.eateryFocus) ||
    normalizeFocusLabel(slots.dishFocus) ||
    normalizeFocusLabel(input.spec.activityFocus) ||
    null;
  const priorFocus =
    normalizeFocusLabel(input.priorConstraints?.eateryFocus) ||
    normalizeFocusLabel(input.previousSpec?.eateryFocus) ||
    null;

  const carryDish = shouldCarryPriorEateryFocus(input.message);
  const dropped =
    !carryDish && priorFocus && focusChanged(priorFocus, nextFocus)
      ? [priorFocus]
      : !carryDish && priorFocus && !nextFocus
        ? [priorFocus]
        : [];

  let mode: ScoutNarrationMode = "Continue";
  if (dropped.length > 0 || (slots.replaceDish && nextFocus)) {
    mode = "Replace";
  } else if (carryDish && nextFocus && priorFocus && !focusChanged(priorFocus, nextFocus)) {
    mode = "Continue";
  } else if (nextFocus && !priorFocus) {
    mode = "Replace";
  } else if (!carryDish && (nextFocus || input.spec.resourceTypes.includes("restaurant"))) {
    mode = "Replace";
  }

  const keepLabelsKo: string[] = [];
  if (carryDish && priorFocus && nextFocus && !focusChanged(priorFocus, nextFocus)) {
    keepLabelsKo.push(priorFocus);
  }
  if (input.spec.transport) {
    keepLabelsKo.push(
      input.spec.transport === "walk"
        ? "도보권"
        : input.spec.transport === "transit"
          ? "대중교통"
          : "이동 범위",
    );
  }

  const intent =
    mode === "Continue" && carryDish && !slots.dishFocus?.trim()
      ? ("Refine" as const)
      : ("Search" as const);

  return {
    version: 1,
    intent,
    mode,
    domain: domainFromSpec(input.spec),
    entityLabelKo: nextFocus,
    dropLabelsKo: dropped,
    keepLabelsKo,
    anchorLabelKo: input.anchorLabelKo?.trim() || null,
    sortHint:
      input.spec.vibe === "popular"
        ? "rating"
        : input.spec.transport === "walk"
          ? "distance"
          : "mixed",
  };
}
