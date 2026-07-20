import type {
  RealityExecutionCapability,
  RealityObjectType,
} from "@/lib/reality-object/types";

const BASE: readonly RealityExecutionCapability[] = [
  "navigate",
  "add_to_inbox",
];

/** Derive executable capabilities from object type (prep only — no auto commit). */
export function capabilitiesForObjectType(
  objectType: RealityObjectType,
): readonly RealityExecutionCapability[] {
  switch (objectType) {
    case "hotel":
    case "accommodation":
      return [...BASE, "book_room", "pay", "add_to_trip"];
    case "restaurant":
    case "cafe":
      return [...BASE, "reserve", "call", "order"];
    case "landmark":
    case "activity":
    case "experience":
      return [...BASE, "buy_ticket", "add_to_trip"];
    case "shopping":
      return [...BASE, "call"];
    case "flight":
    case "train":
    case "ticket":
      return ["buy_ticket", "add_to_inbox", "add_to_trip"];
    case "photo":
    case "video":
    case "reel":
    case "post":
    case "memory":
      return ["add_to_inbox", "add_to_trip"];
    default:
      return [...BASE];
  }
}

export function hasRealityExecutionCapability(
  capabilities: readonly RealityExecutionCapability[],
  capability: RealityExecutionCapability,
): boolean {
  return capabilities.includes(capability);
}
