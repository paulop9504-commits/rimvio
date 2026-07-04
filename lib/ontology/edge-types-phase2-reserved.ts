/**
 * @deprecated Import from `@/lib/ontology/edge-types` — kinds are now in ENTITY_EDGE_KINDS.
 * Re-exports kept for ADR / import stability.
 */

export {
  ENTITY_EDGE_KINDS_PHASE2_RESERVED,
  type EntityEdgeEvidence,
  type EntityEdgeKindPhase2Reserved,
} from "@/lib/ontology/edge-types";

/** @deprecated Use EntityEdgeEvidence trade | bridge | gathering members from edge-types. */
export type EntityEdgeEvidencePhase2Reserved = Extract<
  import("@/lib/ontology/edge-types").EntityEdgeEvidence,
  { type: "trade" | "bridge" | "gathering" }
>;
