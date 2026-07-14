/**
 * Travel utterance scope — broad (parallel nodes) vs narrow (single scout).
 * Not "first turn" — judge the request itself.
 * @see docs/RIMVIO_CONTAINER_AI.md
 */

export type TravelRequestScope = "broad" | "narrow";

/** Explicit single-category asks — forces narrow even on first utterance. */
const NARROW_CATEGORY =
  /(?:항공권|항공|비행기|숙소|호텔|게스트\s*하우스|게스트하우스|호스텔|료칸|민박|펜션|맛집|식당|카페|놀거리|관광|명소|렌터카|렌트카|택시|약국|편의점|hostel|hotel|lodging)(?:\s*만|\s*만\s*좀|\s*하나만)?|(?:만|하나만)\s*(?:찾아|보여|알려)|일단\s*(?:항공|숙소|호텔|게스트\s*하우스|게스트하우스|맛집)/iu;

const DELEGATION_SIGNAL =
  /다\s*알아서|알아서\s*(?:찾아|해|준비)|잘\s*부탁|초행|처음\s*(?:가|와|옴|입니다|이에요)|전부\s*(?:다\s*)?찾아|한꺼번에|다\s*찾아|전반\s*적으로|다\s*준비|전부\s*부탁|first\s*time|never\s*been|take\s*care\s*of\s*(?:it|everything)/iu;

const DATE_RANGE_SIGNAL =
  /(?:\d{1,2}\s*일|\d{1,2}\s*박|\d{4}-\d{2}-\d{2}|주말|연휴|일주일|7\s*일|닷새|나흘)/iu;

const DESTINATION_OR_TRIP_FRAME =
  /(?:여행|출장|trip|abroad)|(?:오사카|도쿄|후쿠오카|제주|교토|삿포로|다낭|방콕|파리|런던|뉴욕|osaka|tokyo|fukuoka|danang)/iu;

export type TravelRequestScopeResult = {
  readonly scope: TravelRequestScope;
  readonly hasNarrowCategory: boolean;
  readonly hasDelegation: boolean;
  readonly hasDateRange: boolean;
  readonly hasTripFrame: boolean;
  readonly reason:
    | "narrow_category"
    | "broad_delegation"
    | "broad_trip_default"
    | "narrow_default";
};

export function hasDelegationSignal(message: string): boolean {
  return DELEGATION_SIGNAL.test(message.trim());
}

/** @deprecated use hasDelegationSignal — kept for callers expecting first-visit wording */
export function hasFirstVisitSignal(message: string): boolean {
  return hasDelegationSignal(message);
}

export function hasDateRangeSignal(message: string): boolean {
  return DATE_RANGE_SIGNAL.test(message.trim());
}

export function hasNarrowCategorySignal(message: string): boolean {
  return NARROW_CATEGORY.test(message.trim());
}

export function hasTripFrameSignal(message: string): boolean {
  return DESTINATION_OR_TRIP_FRAME.test(message.trim());
}

/**
 * Broad: multi-node parallel eligible.
 * Narrow: LocalDiscovery / Operator single tool only.
 *
 * Narrow category always wins over delegation wording.
 * Destination/trip with no category → broad (default open).
 */
export function classifyTravelRequestScope(
  message: string,
): TravelRequestScopeResult {
  const text = message.trim();
  const hasNarrowCategory = hasNarrowCategorySignal(text);
  const hasDelegation = hasDelegationSignal(text);
  const hasDateRange = hasDateRangeSignal(text);
  const hasTripFrame = hasTripFrameSignal(text);

  if (hasNarrowCategory) {
    return {
      scope: "narrow",
      hasNarrowCategory,
      hasDelegation,
      hasDateRange,
      hasTripFrame,
      reason: "narrow_category",
    };
  }

  if (hasDelegation || (hasTripFrame && (hasDateRange || hasDelegation))) {
    return {
      scope: "broad",
      hasNarrowCategory,
      hasDelegation,
      hasDateRange,
      hasTripFrame,
      reason: hasDelegation ? "broad_delegation" : "broad_trip_default",
    };
  }

  // Destination / trip frame only, no category → broad default.
  if (hasTripFrame) {
    return {
      scope: "broad",
      hasNarrowCategory,
      hasDelegation,
      hasDateRange,
      hasTripFrame,
      reason: "broad_trip_default",
    };
  }

  return {
    scope: "narrow",
    hasNarrowCategory,
    hasDelegation,
    hasDateRange,
    hasTripFrame,
    reason: "narrow_default",
  };
}
