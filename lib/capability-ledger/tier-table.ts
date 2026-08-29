/**
 * Capability pricing tier table (P0).
 * Starting model: flat tiers; T5 = revenue share (payout computed separately).
 */

import type {
  CapabilityInputClass,
  CapabilityPricingTier,
} from "@/lib/capability-ledger/types";
import type { RimvioToolId } from "@/lib/tool-registry";
import type { CapabilityId } from "@/lib/capability-registry/capability-contract";

export const TIER_UNIT_PRICE_KRW: Readonly<Record<CapabilityPricingTier, number>> = {
  T0: 1,
  T1: 10,
  T2: 20,
  T3: 50,
  T4: 100,
  T5: 0,
};

export const INPUT_CLASS_TIER: Readonly<Record<CapabilityInputClass, CapabilityPricingTier>> = {
  transform: "T0",
  lookup: "T1",
  rank: "T2",
  analyze: "T3",
  agent: "T4",
  execute: "T5",
  commit_gate: "T5",
};

/** Rimvio Tool → canonical CapabilityId (P2). */
export const TOOL_TO_CAPABILITY_ID: Readonly<Partial<Record<RimvioToolId, CapabilityId>>> = {
  "maps.search": "SEARCH",
  "maps.navigate": "NAVIGATE",
  "hotel.lookup": "BOOK_HOTEL",
  "restaurant.lookup": "SEARCH",
  "pharmacy.lookup": "SEARCH",
  "browse.extract": "SEARCH",
  "ranking.pick": "SEARCH",
  "booking.prepare": "BOOK_HOTEL",
  "calendar.add": "CALENDAR",
};

/** Tool → input class for tier selection. */
export const TOOL_INPUT_CLASS: Readonly<Partial<Record<RimvioToolId, CapabilityInputClass>>> = {
  "maps.search": "lookup",
  "maps.navigate": "analyze",
  "hotel.lookup": "lookup",
  "restaurant.lookup": "lookup",
  "pharmacy.lookup": "lookup",
  "browse.extract": "lookup",
  "ranking.pick": "rank",
  "booking.prepare": "commit_gate",
  "calendar.add": "execute",
};

export function resolveCapabilityIdForTool(toolId: RimvioToolId): CapabilityId {
  return TOOL_TO_CAPABILITY_ID[toolId] ?? "SEARCH";
}

export function resolveInputClassForTool(toolId: RimvioToolId): CapabilityInputClass {
  return TOOL_INPUT_CLASS[toolId] ?? "lookup";
}

export function unitPriceKrwForTool(toolId: RimvioToolId): number {
  const inputClass = resolveInputClassForTool(toolId);
  const tier = INPUT_CLASS_TIER[inputClass];
  return TIER_UNIT_PRICE_KRW[tier];
}

export function defaultDeveloperIdForTool(toolId: RimvioToolId): string {
  if (toolId === "booking.prepare" || toolId === "hotel.lookup") {
    return "rimvio-core-lodging";
  }
  if (toolId === "restaurant.lookup") {
    return "rimvio-core-eatery";
  }
  return "rimvio-core";
}
