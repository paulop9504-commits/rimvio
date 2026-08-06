/**
 * Clear new-trip create — routes to Globe Ingress + Continuum (Day skeleton),
 * not Workspace Agent Patch/Scout or compound graph_command.
 */

import { isTripPrepUtterance } from "@/lib/action-planner/build-trip-prep-plan";
import { isGlobeIngressEligible } from "@/lib/globe-ingress/compile-globe-ingress";
import { isInstantLodgingSearch } from "@/lib/globe/context-condition-ai/instant-lodging-search";
import { isInstantEaterySearch } from "@/lib/globe/context-condition-ai/instant-eatery-search";
import {
  extractTravelDestination,
  isLightTripGoUtterance,
  isTravelTripAnnouncement,
} from "@/lib/experience-run/extract-travel-destination";

/**
 * 「내일모래 4박5일 오사카 … 일정좀 짜줘」·「하와이로 간다」 class —
 * Intent creates a trip Context (never attaches onto open Osaka by mistake).
 */
export function isNewTripGlobeIngressUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  // Lodging/eatery scout stays on Workspace Agent.
  if (isInstantLodgingSearch(text) || isInstantEaterySearch(text)) {
    return false;
  }
  if (isTripPrepUtterance(text)) {
    return isGlobeIngressEligible(text);
  }
  // Overseas / any dest + go — new Continuum Context.
  if (
    extractTravelDestination(text) &&
    (isLightTripGoUtterance(text) || isTravelTripAnnouncement(text))
  ) {
    return isGlobeIngressEligible(text);
  }
  return false;
}
