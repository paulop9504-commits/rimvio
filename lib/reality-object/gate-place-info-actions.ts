import { capabilitiesForObjectType } from "@/lib/reality-object/capabilities-for-type";
import { detectRealityObjectType } from "@/lib/reality-object/detect-reality-object-type";
import { hasRealityExecutionCapability } from "@/lib/reality-object/capabilities-for-type";
import type {
  RealityExecutionCapability,
  RealityPinCompatKind,
} from "@/lib/reality-object/types";

export type PlaceInfoActionHandlers = {
  onCall?: (() => void) | null;
  onDirections?: (() => void) | null;
  onReservePrep?: (() => void) | null;
  onBookNow?: (() => void) | null;
  onAddToExecutionInbox?: (() => void) | null;
};

/**
 * Gate Info card handlers by Reality Object execution capabilities.
 * Handlers without a matching capability are dropped (prep still human-gated).
 */
export function gatePlaceInfoActionsByCapabilities(input: {
  capabilities: readonly RealityExecutionCapability[];
  handlers: PlaceInfoActionHandlers;
}): PlaceInfoActionHandlers {
  const caps = input.capabilities;
  const h = input.handlers;
  return {
    onCall:
      h.onCall && hasRealityExecutionCapability(caps, "call") ? h.onCall : null,
    onDirections:
      h.onDirections && hasRealityExecutionCapability(caps, "navigate")
        ? h.onDirections
        : null,
    onReservePrep:
      h.onReservePrep &&
      (hasRealityExecutionCapability(caps, "reserve") ||
        hasRealityExecutionCapability(caps, "book_room") ||
        hasRealityExecutionCapability(caps, "buy_ticket"))
        ? h.onReservePrep
        : null,
    onBookNow:
      h.onBookNow &&
      (hasRealityExecutionCapability(caps, "book_room") ||
        hasRealityExecutionCapability(caps, "pay") ||
        hasRealityExecutionCapability(caps, "buy_ticket"))
        ? h.onBookNow
        : null,
    onAddToExecutionInbox:
      h.onAddToExecutionInbox &&
      hasRealityExecutionCapability(caps, "add_to_inbox")
        ? h.onAddToExecutionInbox
        : null,
  };
}

/** Derive capabilities from discovery card kind + title when no stored object yet. */
export function capabilitiesForDiscoveryCard(input: {
  kind: RealityPinCompatKind | "lodging" | "eatery" | "activity" | "amenity";
  title: string;
  categoryLabel?: string | null;
}): readonly RealityExecutionCapability[] {
  const pinKind: RealityPinCompatKind =
    input.kind === "lodging" ||
    input.kind === "eatery" ||
    input.kind === "activity" ||
    input.kind === "amenity"
      ? input.kind
      : "activity";
  const objectType = detectRealityObjectType({
    title: input.title,
    pinKind,
    categoryLabel: input.categoryLabel,
  });
  return capabilitiesForObjectType(objectType);
}
