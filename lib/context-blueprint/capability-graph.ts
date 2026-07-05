/**
 * Capability Graph — WHAT resources/abilities the context requires.
 * OS manages Resources; travel = capability composition.
 * Spatial Target attaches per capability (optional for digital).
 * @see docs/RIMVIO_EXECUTION_CAPABILITY_GRAPH.md
 */

import type { ContextResourceKind, DomainExecutorId } from "@/lib/context-blueprint/blueprint-constants";
import type { ExecutionSpaceResolution } from "@/lib/context-blueprint/execution-space-slots";
import type { SpatialTarget } from "@/lib/context-blueprint/spatial-target";
import { composeDigitalSpatialTarget, composePhysicalSpatialTarget } from "@/lib/context-blueprint/spatial-target";

export const CAPABILITY_KINDS = [
  "mobility",
  "lodging",
  "eatery",
  "payment",
  "schedule",
  "communication",
  "insurance",
  "identity",
  "inventory",
  "digital_delivery",
  "care",
  "custom",
] as const;

export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];

export const CAPABILITY_NODE_STATUSES = [
  "pending",
  "hypothesis",
  "allocated",
  "prepared",
  "committed",
] as const;

export type CapabilityNodeStatus = (typeof CAPABILITY_NODE_STATUSES)[number];

/**
 * One required ability — e.g. lodging resolves: region → property (hypothesis until user confirms).
 * lodging → Osaka → hotel is capability-level spatial nesting, not root spatial plan.
 */
export type CapabilityNode = {
  readonly id: string;
  readonly kind: CapabilityKind;
  readonly label: string;
  readonly required: boolean;
  readonly resolution: ExecutionSpaceResolution;
  readonly spatialTarget: SpatialTarget | null;
  readonly resourceKinds: readonly ContextResourceKind[];
  readonly assignedExecutor: DomainExecutorId | null;
  readonly parentCapabilityId?: string | null;
  readonly status: CapabilityNodeStatus;
};

export type CapabilityEdge = {
  readonly fromCapabilityId: string;
  readonly toCapabilityId: string;
  readonly reason?: string | null;
};

export type CapabilityGraph = {
  readonly graphKind: "capability_graph";
  readonly capabilities: readonly CapabilityNode[];
  readonly edges: readonly CapabilityEdge[];
};

export type ComposeCapabilityGraphInput = {
  capabilities: readonly CapabilityNode[];
  edges?: readonly CapabilityEdge[];
};

export function composeCapabilityGraph(
  input: ComposeCapabilityGraphInput,
): CapabilityGraph {
  const ids = new Set(input.capabilities.map((row) => row.id));
  for (const edge of input.edges ?? []) {
    if (!ids.has(edge.fromCapabilityId) || !ids.has(edge.toCapabilityId)) {
      throw new Error("[CapabilityGraph] edge references unknown capability");
    }
  }
  return {
    graphKind: "capability_graph",
    capabilities: [...input.capabilities],
    edges: [...(input.edges ?? [])],
  };
}

export function readCapabilityByKind(
  graph: CapabilityGraph,
  kind: CapabilityKind,
): CapabilityNode[] {
  return graph.capabilities.filter((row) => row.kind === kind);
}

export function readUnresolvedCapabilities(
  graph: CapabilityGraph,
): CapabilityNode[] {
  return graph.capabilities.filter((row) => row.resolution === "unresolved");
}

export { composeDigitalSpatialTarget, composePhysicalSpatialTarget };
