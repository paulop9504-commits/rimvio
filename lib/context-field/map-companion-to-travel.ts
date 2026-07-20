/**
 * Map Context Field companion → TravelBrain companionMode (rank hint SSOT).
 */

import type { ContextCompanion } from "@/lib/context-field/types";
import type { TravelCompanionMode } from "@/lib/situation-projection/travel-brain-personalization";

export function mapContextCompanionToTravelMode(
  companion: ContextCompanion | null | undefined,
): TravelCompanionMode | null {
  if (!companion) {
    return null;
  }
  switch (companion) {
    case "solo":
      return "solo";
    case "date":
      return "couple";
    case "family":
      return "family";
    case "group":
      return "friends";
    default:
      return null;
  }
}
