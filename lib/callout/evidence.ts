/**
 * Observe Evidence — why this object was recommended.
 * Evidence is a graph reference, not plain copy.
 */

export const EVIDENCE_TYPES = [
  "distance",
  "price",
  "preference",
  "review",
  "availability",
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

/** What the map / Workspace should highlight when Evidence is selected. */
export type EvidenceGraphRef = {
  readonly kind: "node" | "edge" | "route" | "self";
  /** Target Workspace / Rimvio object node */
  readonly nodeId: string | null;
  /** Relationship edge id when kind === "edge" */
  readonly edgeId: string | null;
  /** Optional camera target */
  readonly lat: number | null;
  readonly lng: number | null;
  /** Second endpoint for edge / route camera fit */
  readonly toLat: number | null;
  readonly toLng: number | null;
  readonly toNodeId: string | null;
};

/**
 * Grounded recommendation evidence with graph identity.
 * Click → highlight the referenced node / edge on the map.
 */
export type Evidence = {
  readonly id: string;
  readonly type: EvidenceType;
  readonly title: string;
  readonly value: string;
  /** Relative contribution to Observe AI Score (0–1) */
  readonly weight: number;
  readonly source: string;
  readonly present: boolean;
  readonly graphRef: EvidenceGraphRef | null;
};

/** @deprecated use Evidence — kept as alias during Callout migration */
export type CalloutEvidence = Evidence;
/** @deprecated use EvidenceType */
export type CalloutEvidenceLayer = EvidenceType;
