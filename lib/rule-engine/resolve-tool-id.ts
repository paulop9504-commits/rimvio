/**
 * Tool Router — Intent (+ domain) → concrete Tool Registry id.
 * Planner steps call this instead of hardcoding tool ids.
 */

import type { IntentFamily, ToolFamily } from "@/lib/rule-engine/constitution";
import { routeToolFamily } from "@/lib/rule-engine/route-tool-family";
import { isAmenityLookupQuery } from "@/lib/tool-registry/amenity-lookup-cue";
import type { RimvioToolId } from "@/lib/tool-registry";

export type PlannerLookupDomain = "lodging" | "eatery" | "poi" | "amenity";

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

  if (input.intent === "Reserve" || family === "booking") {
    return "booking.prepare";
  }
  if (input.intent === "Purchase" || family === "payment") {
    return "booking.prepare";
  }
  if (
    input.intent === "Analyze" ||
    input.intent === "Predict" ||
    family === "ranking"
  ) {
    return "ranking.pick";
  }
  if (input.intent === "Search" || family === "maps") {
    if (input.domain === "lodging") {
      return "hotel.lookup";
    }
    if (input.domain === "eatery") {
      return "restaurant.lookup";
    }
    if (
      input.domain === "amenity" ||
      (input.domain === "poi" && isAmenityLookupQuery(input.query ?? ""))
    ) {
      return "pharmacy.lookup";
    }
    if (input.query && isAmenityLookupQuery(input.query)) {
      return "pharmacy.lookup";
    }
    return "maps.search";
  }
  if (input.intent === "Navigate") {
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
  return (
    resolveToolIdForIntent({ intent: "Search", domain, query }) ??
    (domain === "eatery"
      ? "restaurant.lookup"
      : domain === "amenity"
        ? "pharmacy.lookup"
        : "hotel.lookup")
  );
}
