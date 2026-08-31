/**
 * Rimvio Index — capability dependency graph (P3).
 * SSOT for deterministic traversal; seeded from Hub context-discovery + platform-source-map.
 */

import {
  canCapabilityCall,
  type CapabilityCallNode,
} from "@/lib/trust-pipeline";

export type RimvioGraphNodeKind =
  | "capability"
  | "code"
  | "workspace"
  | "tool";

export type RimvioGraphEdge = {
  readonly from: string;
  readonly to: string;
  readonly relation: "depends_on" | "implemented_by" | "uses";
};

/** Hub context-discovery edges + platform capability deps. */
export const RIMVIO_CAPABILITY_DEPENDENCY_EDGES: Readonly<
  Record<string, readonly string[]>
> = {
  "booking.cancel": [
    "payment.refund",
    "payment.commit",
    "payment.prepare",
    "booking.confirm",
  ],
  "booking.confirm": ["booking.prepare", "payment.prepare"],
  "payment.commit": ["payment.prepare"],
  "hotel.search": ["hotel.detail"],
  "hotel.lookup": ["ranking.pick"],
  "restaurant.lookup": ["ranking.pick"],
  "booking.prepare": ["room.availability", "hotel.detail"],
  "market.search": ["market.detail"],
  "commerce.coupang.search": ["commerce.coupang.detail", "commerce.coupang.cart"],
  "commerce.coupang.purchase": [
    "commerce.coupang.cart",
    "commerce.coupang.detail",
    "payment.prepare",
  ],
};

/** Tool → capability implementation mapping for graph traversal. */
export const RIMVIO_TOOL_IMPLEMENTS_CAPABILITY: Readonly<
  Record<string, string>
> = {
  "hotel.lookup": "hotel.search",
  "restaurant.lookup": "eatery.search",
  "ranking.pick": "ranking.select",
  "booking.prepare": "booking.prepare",
  "maps.search": "maps.search",
  "maps.navigate": "maps.navigate",
};

export function expandCapabilityDependencies(
  seeds: readonly string[],
): readonly string[] {
  const seen = new Set<string>();
  const queue = [...seeds.filter(Boolean)];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const dep of RIMVIO_CAPABILITY_DEPENDENCY_EDGES[id] ?? []) {
      if (!seen.has(dep)) queue.push(dep);
    }
  }
  return [...seen];
}

export function capabilityDependenciesOfTool(toolId: string): readonly string[] {
  const cap = RIMVIO_TOOL_IMPLEMENTS_CAPABILITY[toolId];
  if (!cap) return [];
  return expandCapabilityDependencies([cap]);
}

export function buildDependencyGraphEdges(): readonly RimvioGraphEdge[] {
  const edges: RimvioGraphEdge[] = [];
  for (const [from, deps] of Object.entries(RIMVIO_CAPABILITY_DEPENDENCY_EDGES)) {
    for (const to of deps) {
      edges.push({ from, to, relation: "depends_on" });
    }
  }
  for (const [toolId, capId] of Object.entries(RIMVIO_TOOL_IMPLEMENTS_CAPABILITY)) {
    edges.push({ from: capId, to: toolId, relation: "implemented_by" });
  }
  return edges;
}

export function findRelatedCapabilities(input: {
  readonly capabilityId: string;
  readonly maxDepth?: number;
}): readonly string[] {
  const maxDepth = input.maxDepth ?? 2;
  const related = new Set<string>([input.capabilityId]);
  let frontier = [input.capabilityId];
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const dep of RIMVIO_CAPABILITY_DEPENDENCY_EDGES[id] ?? []) {
        if (!related.has(dep)) {
          related.add(dep);
          next.push(dep);
        }
      }
      for (const [cap, deps] of Object.entries(RIMVIO_CAPABILITY_DEPENDENCY_EDGES)) {
        if (deps.includes(id) && !related.has(cap)) {
          related.add(cap);
          next.push(cap);
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return [...related];
}

export function assertUnverifiedCannotCallTrusted(
  caller: CapabilityCallNode,
  callee: CapabilityCallNode,
) {
  return canCapabilityCall(caller, callee);
}
