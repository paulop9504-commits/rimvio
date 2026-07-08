import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { copy } from "@/lib/copy/human-ko";

/** Short noun for chips · secondary lines · badges. */
export function activitySubtypeNoun(
  subtype: LocalDiscoveryActivitySubtype | null | undefined,
): string {
  switch (subtype) {
    case "shopping":
      return copy.globe.activitySubtypeShopping;
    case "museum":
      return copy.globe.activitySubtypeMuseum;
    case "park":
      return copy.globe.activitySubtypePark;
    case "nightlife":
      return copy.globe.activitySubtypeNightlife;
    case "photo_spot":
      return copy.globe.activitySubtypePhotoSpot;
    case "general":
    default:
      return copy.globe.activitySubtypeGeneral;
  }
}

/** Map pin badge — shorter than the noun. */
export function activitySubtypeBadgeLabel(
  subtype: LocalDiscoveryActivitySubtype | null | undefined,
): string {
  switch (subtype) {
    case "shopping":
      return copy.globe.activitySubtypeBadgeShopping;
    case "museum":
      return copy.globe.activitySubtypeBadgeMuseum;
    case "park":
      return copy.globe.activitySubtypeBadgePark;
    case "nightlife":
      return copy.globe.activitySubtypeBadgeNightlife;
    case "photo_spot":
      return copy.globe.activitySubtypeBadgePhotoSpot;
    default:
      return copy.globe.contextConditionPinBadge;
  }
}

/** Primary CTA on resource reel / focus sheets. */
export function activitySubtypeActionLabel(
  subtype: LocalDiscoveryActivitySubtype | null | undefined,
): string {
  switch (subtype) {
    case "shopping":
      return copy.globe.activitySubtypeActionShopping;
    case "museum":
      return copy.globe.activitySubtypeActionMuseum;
    case "park":
      return copy.globe.activitySubtypeActionPark;
    case "nightlife":
      return copy.globe.activitySubtypeActionNightlife;
    case "photo_spot":
      return copy.globe.activitySubtypeActionPhotoSpot;
    default:
      return copy.globe.activitySubtypeActionGeneral;
  }
}

/** One-line follow-up after a marker insight in chat. */
export function activitySubtypeChatActionHint(
  subtype: LocalDiscoveryActivitySubtype | null | undefined,
): string {
  switch (subtype) {
    case "shopping":
      return copy.globe.activitySubtypeChatHintShopping;
    case "museum":
      return copy.globe.activitySubtypeChatHintMuseum;
    case "park":
      return copy.globe.activitySubtypeChatHintPark;
    case "nightlife":
      return copy.globe.activitySubtypeChatHintNightlife;
    case "photo_spot":
      return copy.globe.activitySubtypeChatHintPhotoSpot;
    default:
      return copy.globe.activitySubtypeChatHintGeneral;
  }
}
