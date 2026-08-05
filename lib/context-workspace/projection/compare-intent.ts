/**
 * Compare Intent — domain-agnostic NL → compare_decision.
 *
 * ❌ hotel_compare_intent
 * ✅ compare intent + target (hotel | restaurant | hospital | …)
 */

import type { ContextWorkspaceDomain } from "@/lib/context-workspace/types";

/** Extensible compare targets — all route to compare_decision projection. */
export const COMPARE_INTENT_TARGETS = [
  "hotel",
  "restaurant",
  "hospital",
  "realestate",
  "company",
  "lodging",
  "eatery",
  "poi",
  "amenity",
  "place",
] as const;

export type CompareIntentTarget = (typeof COMPARE_INTENT_TARGETS)[number];

export type CompareIntent = {
  readonly intent: "compare";
  readonly target: CompareIntentTarget;
  readonly contextId: string;
  readonly criteriaFromContext: true;
};

const TARGET_CUES: readonly {
  readonly target: CompareIntentTarget;
  readonly re: RegExp;
}[] = [
  { target: "hotel", re: /호텔|숙소|모텔|게스트\s*하우스|료칸|ryokan|hotel|lodging|stay/iu },
  { target: "restaurant", re: /맛집|식당|카페|레스토랑|음식|restaurant|cafe|eatery|food/iu },
  { target: "hospital", re: /병원|클리닉|pharmacy|약국|hospital|clinic/iu },
  { target: "realestate", re: /부동산|매물|아파트|오피스텔|real\s*estate|property/iu },
  { target: "company", re: /회사|기업|오피스|company|office|corp/iu },
];

/** Map product target → Workspace node domain filter. */
export function compareTargetToWorkspaceDomain(
  target: CompareIntentTarget,
): ContextWorkspaceDomain | null {
  switch (target) {
    case "hotel":
    case "lodging":
      return "lodging";
    case "restaurant":
    case "eatery":
      return "eatery";
    case "hospital":
    case "amenity":
      return "amenity";
    case "realestate":
    case "company":
    case "poi":
    case "place":
      return "poi";
    default:
      return null;
  }
}

export function workspaceDomainToCompareTarget(
  domain: ContextWorkspaceDomain,
): CompareIntentTarget {
  if (domain === "lodging") return "hotel";
  if (domain === "eatery") return "restaurant";
  if (domain === "amenity") return "hospital";
  return "place";
}

/**
 * Parse NL → Compare Intent.
 * "호텔 비교해줘" → { intent:"compare", target:"hotel", criteriaFromContext:true }
 */
export function parseCompareIntent(input: {
  readonly utterance: string;
  readonly contextId: string;
  readonly sessionDomain?: ContextWorkspaceDomain | null;
}): CompareIntent | null {
  const text = input.utterance.trim();
  const contextId = input.contextId.trim();
  if (!text || !contextId) return null;
  if (!/비교|compare|vs\.?|대비/iu.test(text)) return null;

  let target: CompareIntentTarget | null = null;
  for (const cue of TARGET_CUES) {
    if (cue.re.test(text)) {
      target = cue.target;
      break;
    }
  }
  if (!target && input.sessionDomain) {
    target = workspaceDomainToCompareTarget(input.sessionDomain);
  }
  if (!target) {
    target = "place";
  }

  return {
    intent: "compare",
    target,
    contextId,
    criteriaFromContext: true,
  };
}

export function isCompareIntentUtterance(utterance: string): boolean {
  return parseCompareIntent({
    utterance,
    contextId: "_",
  }) != null;
}
