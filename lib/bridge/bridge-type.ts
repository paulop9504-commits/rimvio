/** Bridge family — storage schema + UI diverge by type. */

export const BRIDGE_TYPE_META_KEY = "bridgeType" as const;

export type MemoryBridgeType =
  | "memory"
  | "travel"
  | "meeting"
  | "project";

export type BridgeType = MemoryBridgeType | "marketplace";

export type BridgeTypeFamily = "memory" | "marketplace";

export function bridgeTypeFamily(type: BridgeType): BridgeTypeFamily {
  return type === "marketplace" ? "marketplace" : "memory";
}

export function isMarketplaceBridgeType(type: BridgeType | null | undefined): boolean {
  return type === "marketplace";
}

export function isMemoryBridgeType(type: BridgeType | null | undefined): boolean {
  return type != null && type !== "marketplace";
}

export function readBridgeTypeFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): BridgeType | null {
  const raw = metadata?.[BRIDGE_TYPE_META_KEY];
  if (raw === "marketplace") {
    return "marketplace";
  }
  if (
    raw === "memory" ||
    raw === "travel" ||
    raw === "meeting" ||
    raw === "project"
  ) {
    return raw;
  }
  if (metadata?.marketIntent) {
    return "marketplace";
  }
  return null;
}
