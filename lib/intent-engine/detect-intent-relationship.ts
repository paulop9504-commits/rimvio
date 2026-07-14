/**
 * Intent Relationship Detector — Cursor-like Resolve Target before search.
 * Prevents context bleeding across lodging stay types (guesthouse → capsule).
 *
 * @see engines/intent/constitution.md
 * @see lib/globe/lodging/lodging-stay-types.ts
 */

import {
  lodgingStayTypeToBand,
  lodgingStayTypesConflict,
  normalizeLodgingStayType,
  parseLodgingStayTypeFromText,
  type LodgingStayType,
} from "@/lib/globe/lodging/lodging-stay-types";

export const INTENT_RELATIONSHIPS = [
  "continue",
  "replace",
  "merge",
  "branch",
  "discard",
] as const;

export type IntentRelationship = (typeof INTENT_RELATIONSHIPS)[number];

export type IntentDomainSlice = {
  /** Coarse domain: lodging | eatery | activity | amenity | transit | flight | weather | trip | unknown */
  readonly domain: string;
  /** Fine lodging stay type id (capsule | guesthouse | ryokan | …) */
  readonly kind: string | null;
  readonly destinationLabel: string | null;
};

export type IntentRelationshipDecision = {
  readonly relationship: IntentRelationship;
  readonly reason: string;
  readonly previous: IntentDomainSlice | null;
  readonly next: IntentDomainSlice;
  /** When replace/discard: clear prior lodgingKind / resource focus before scout */
  readonly clearPriorDomainKinds: boolean;
  /** When merge: keep prior kinds as additive soft bias */
  readonly mergeKinds: boolean;
};

const CONTINUE_SLOT =
  /^(?:가격|얼마|예산|체크인|체크아웃|날짜|인원|몇\s*명|위치|어디\s*쪽|리뷰|후기|방|객실|어때|더\s*싸|더\s*좋)/iu;

const MERGE_ALSO =
  /(?:도\s*찾아|도\s*보여|함께|같이|플러스|plus|\balso\b|그리고\s*(?:숙소|호텔|게스트|료칸|캡슐|펜션|리조트|한옥|글램핑))/iu;

const DISCARD =
  /(?:이전\s*(?:검색|거|거\s*)?무시|다\s*무시|처음부터|리셋|reset|무시하고|안\s*보고)/iu;

const BRANCH_DEST =
  /(?:도쿄|오사카|교토|후쿠오카|제주|부산|서울|나고야|삿포로|osaka|tokyo|kyoto|fukuoka|jeju)/iu;

function detectDomain(text: string): IntentDomainSlice {
  const trimmed = text.trim();
  const lodgingStay = parseLodgingStayTypeFromText(trimmed);
  if (lodgingStay) {
    return {
      domain: "lodging",
      kind: lodgingStay,
      destinationLabel: extractDestination(trimmed),
    };
  }
  if (/숙소|숙박|lodging|accommodation/iu.test(trimmed)) {
    return {
      domain: "lodging",
      kind: null,
      destinationLabel: extractDestination(trimmed),
    };
  }
  if (/맛집|식당|카페|먹을|레스토랑|eatery|restaurant|food/iu.test(trimmed)) {
    return {
      domain: "eatery",
      kind: null,
      destinationLabel: extractDestination(trimmed),
    };
  }
  if (/놀거리|관광|명소|activity|attraction/iu.test(trimmed)) {
    return {
      domain: "activity",
      kind: null,
      destinationLabel: extractDestination(trimmed),
    };
  }
  if (/날씨|기온|weather/iu.test(trimmed)) {
    return {
      domain: "weather",
      kind: null,
      destinationLabel: extractDestination(trimmed),
    };
  }
  if (/항공|비행|flight/iu.test(trimmed)) {
    return {
      domain: "flight",
      kind: null,
      destinationLabel: extractDestination(trimmed),
    };
  }
  if (/여행|출장|trip/iu.test(trimmed)) {
    return {
      domain: "trip",
      kind: null,
      destinationLabel: extractDestination(trimmed),
    };
  }
  return {
    domain: "unknown",
    kind: null,
    destinationLabel: extractDestination(trimmed),
  };
}

function extractDestination(text: string): string | null {
  const m = text.match(BRANCH_DEST);
  return m?.[0]?.trim() ?? null;
}

/**
 * Decide how the new utterance relates to the active intent slice.
 */
export function detectIntentRelationship(input: {
  previousText?: string | null;
  previousSlice?: IntentDomainSlice | null;
  nextText: string;
}): IntentRelationshipDecision {
  const next = detectDomain(input.nextText);
  const previous =
    input.previousSlice ??
    (input.previousText?.trim()
      ? detectDomain(input.previousText)
      : null);

  if (DISCARD.test(input.nextText)) {
    return {
      relationship: "discard",
      reason: "explicit_discard",
      previous,
      next,
      clearPriorDomainKinds: true,
      mergeKinds: false,
    };
  }

  if (!previous || previous.domain === "unknown") {
    return {
      relationship: "replace",
      reason: "no_prior_intent",
      previous,
      next,
      clearPriorDomainKinds: true,
      mergeKinds: false,
    };
  }

  if (
    CONTINUE_SLOT.test(input.nextText.trim()) ||
    (/^(?:가격은|후기는|어때|더\s*(?:싸|좋))/iu.test(input.nextText.trim()) &&
      previous.domain === next.domain)
  ) {
    return {
      relationship: "continue",
      reason: "slot_follow_up",
      previous,
      next: {
        domain: previous.domain,
        kind: previous.kind,
        destinationLabel: next.destinationLabel ?? previous.destinationLabel,
      },
      clearPriorDomainKinds: false,
      mergeKinds: false,
    };
  }

  // Additive same domain ("료칸도") before exclusive Replace
  if (
    previous.domain === next.domain &&
    MERGE_ALSO.test(input.nextText) &&
    next.kind &&
    previous.kind &&
    next.kind !== previous.kind
  ) {
    return {
      relationship: "merge",
      reason: "additive_same_domain",
      previous,
      next,
      clearPriorDomainKinds: false,
      mergeKinds: true,
    };
  }

  // Lodging stay-type conflict → Replace (guesthouse → capsule, hotel → ryokan, …)
  if (
    previous.domain === "lodging" &&
    next.domain === "lodging" &&
    lodgingStayTypesConflict(
      previous.kind as LodgingStayType | null,
      next.kind as LodgingStayType | null,
    )
  ) {
    return {
      relationship: "replace",
      reason: "lodging_stay_type_conflict",
      previous,
      next,
      clearPriorDomainKinds: true,
      mergeKinds: false,
    };
  }

  if (
    previous.domain === next.domain &&
    next.destinationLabel &&
    previous.destinationLabel &&
    next.destinationLabel.toLowerCase() !==
      previous.destinationLabel.toLowerCase()
  ) {
    return {
      relationship: "branch",
      reason: "destination_branch",
      previous,
      next,
      clearPriorDomainKinds: false,
      mergeKinds: false,
    };
  }

  if (previous.domain !== next.domain && next.domain !== "unknown") {
    return {
      relationship: "replace",
      reason: "domain_switch",
      previous,
      next,
      clearPriorDomainKinds: true,
      mergeKinds: false,
    };
  }

  if (previous.domain === next.domain && previous.kind === next.kind) {
    return {
      relationship: "continue",
      reason: "same_slice",
      previous,
      next,
      clearPriorDomainKinds: false,
      mergeKinds: false,
    };
  }

  return {
    relationship: "replace",
    reason: "default_new_target",
    previous,
    next,
    clearPriorDomainKinds: true,
    mergeKinds: false,
  };
}

/** Map relationship lodging kind → LocalDiscovery lodgingKind band */
export function lodgingKindFromIntentSlice(
  slice: IntentDomainSlice,
): "hotel" | "airbnb" | "hostel" | "any" | null {
  if (slice.domain !== "lodging") {
    return null;
  }
  if (!slice.kind) {
    return "any";
  }
  return lodgingStayTypeToBand(slice.kind as LodgingStayType);
}

export function lodgingStayTypeFromIntentSlice(
  slice: IntentDomainSlice,
): LodgingStayType | null {
  if (slice.domain !== "lodging" || !slice.kind) {
    return null;
  }
  return normalizeLodgingStayType(slice.kind);
}
