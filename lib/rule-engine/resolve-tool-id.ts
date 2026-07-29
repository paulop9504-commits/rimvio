/**
 * Tool Router — Intent (+ domain) → concrete Tool Registry id.
 * Planner steps call this instead of hardcoding tool ids.
 */

import type { IntentFamily, ToolFamily } from "@/lib/rule-engine/constitution";
import { routeToolFamily } from "@/lib/rule-engine/route-tool-family";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import { isAmenityLookupQuery } from "@/lib/tool-registry/amenity-lookup-cue";
import { isBrowseExtractQuery } from "@/lib/tool-registry/browse-extract";
import type { RimvioToolId } from "@/lib/tool-registry";

export type PlannerLookupDomain = "lodging" | "eatery" | "poi" | "amenity";

/** Infer lookup domain from utterance when planner omitted domain. */
export function resolvePlannerLookupDomain(
  query?: string | null,
): PlannerLookupDomain {
  const text = query?.trim() ?? "";
  if (!text) {
    return "lodging";
  }
  if (isAmenityLookupQuery(text) || /약\s*사러/iu.test(text)) {
    return "amenity";
  }
  if (hasEateryDomainCue(text) || /맛집|식당|카페|restaurant|food/iu.test(text)) {
    return "eatery";
  }
  if (
    hasLodgingDomainCue(text) ||
    /호텔|숙소|모텔|hotel|stay|capsule|캡슐/iu.test(text)
  ) {
    return "lodging";
  }
  if (
    isBrowseExtractQuery(text) ||
    /관광|명소|poi|테마\s*파크|액티비티|입장권|티켓/iu.test(text)
  ) {
    return "poi";
  }
  return "lodging";
}

/**
 * Map Intent family (+ optional domain) to a registry tool id.
 * Returns null when the Intent is Graph-only (no Tool Registry call).
 */
export function resolveToolIdForIntent(input: {
  readonly intent: IntentFamily;
  readonly domain?: PlannerLookupDomain | null;
  readonly toolFamily?: ToolFamily | null;
  readonly query?: string | null;
}): RimvioToolId | null {
  const family = input.toolFamily ?? routeToolFamily(input.intent);
  const domain =
    input.domain ??
    (input.intent === "Search" || family === "maps"
      ? resolvePlannerLookupDomain(input.query)
      : null);

  if (input.intent === "Reserve" || family === "booking") {
    return "booking.prepare";
  }
  if (input.intent === "Purchase" || family === "payment") {
    return "booking.prepare";
  }
  if (input.intent === "Navigate") {
    return "maps.navigate";
  }
  if (input.intent === "Calendar" || family === "calendar") {
    return "calendar.add";
  }
  if (
    input.intent === "Analyze" ||
    input.intent === "Predict" ||
    family === "ranking"
  ) {
    return "ranking.pick";
  }
  if (input.intent === "Search" || family === "maps") {
    if (input.query && isBrowseExtractQuery(input.query)) {
      return "browse.extract";
    }
    if (domain === "lodging") {
      return "hotel.lookup";
    }
    if (domain === "eatery") {
      return "restaurant.lookup";
    }
    if (
      domain === "amenity" ||
      (domain === "poi" && isAmenityLookupQuery(input.query ?? ""))
    ) {
      return "pharmacy.lookup";
    }
    if (input.query && isAmenityLookupQuery(input.query)) {
      return "pharmacy.lookup";
    }
    return "maps.search";
  }

  // Revise / Compare / Pin / Delete / Filter / … → Graph Engine only (no Tool).
  if (input.intent === "Revise" || family === "graph") {
    return null;
  }

  return null;
}

/** Lookup tool for a resolve_entity planner step. */
export function resolveLookupToolId(
  domain: PlannerLookupDomain = "lodging",
  query?: string | null,
): RimvioToolId {
  if (query && isBrowseExtractQuery(query)) {
    return "browse.extract";
  }
  return (
    resolveToolIdForIntent({ intent: "Search", domain, query }) ??
    (domain === "eatery"
      ? "restaurant.lookup"
      : domain === "amenity"
        ? "pharmacy.lookup"
        : domain === "poi"
          ? "maps.search"
          : "hotel.lookup")
  );
}
