/**
 * Reality Primitives — atomic facets of lived Reality.
 * Domains (travel, market…) are compositions of these — not hard-coded app shells.
 * @see docs/adr/034-reality-os-primitives-projection.md
 */

export const REALITY_PRIMITIVES = [
  "spatial",
  "timeline",
  "object",
  "pipeline",
  "transaction",
  "communication",
  "document",
  "entity",
  "recommendation",
  "evidence",
  "ledger",
  "dashboard",
  "kanban",
] as const;

export type RealityPrimitiveId = (typeof REALITY_PRIMITIVES)[number];

export type RealityPrimitiveDef = {
  readonly id: RealityPrimitiveId;
  readonly labelKo: string;
  /** Default Node surface hint when this primitive dominates the projection. */
  readonly projectionHint:
    | "map"
    | "timeline"
    | "cards"
    | "pipeline"
    | "thread"
    | "list"
    | "dashboard"
    | "canvas"
    | "ledger";
};

export const REALITY_PRIMITIVE_DEFS: Readonly<
  Record<RealityPrimitiveId, RealityPrimitiveDef>
> = {
  spatial: {
    id: "spatial",
    labelKo: "공간",
    projectionHint: "map",
  },
  timeline: {
    id: "timeline",
    labelKo: "시간",
    projectionHint: "timeline",
  },
  object: {
    id: "object",
    labelKo: "물건",
    projectionHint: "cards",
  },
  pipeline: {
    id: "pipeline",
    labelKo: "과정",
    projectionHint: "pipeline",
  },
  transaction: {
    id: "transaction",
    labelKo: "거래",
    projectionHint: "cards",
  },
  communication: {
    id: "communication",
    labelKo: "소통",
    projectionHint: "thread",
  },
  document: {
    id: "document",
    labelKo: "문서",
    projectionHint: "list",
  },
  entity: {
    id: "entity",
    labelKo: "주체",
    projectionHint: "cards",
  },
  recommendation: {
    id: "recommendation",
    labelKo: "추천",
    projectionHint: "cards",
  },
  evidence: {
    id: "evidence",
    labelKo: "증거",
    projectionHint: "list",
  },
  ledger: {
    id: "ledger",
    labelKo: "장부",
    projectionHint: "ledger",
  },
  dashboard: {
    id: "dashboard",
    labelKo: "현황",
    projectionHint: "dashboard",
  },
  kanban: {
    id: "kanban",
    labelKo: "보드",
    projectionHint: "canvas",
  },
};

export function realityPrimitiveDef(
  id: RealityPrimitiveId,
): RealityPrimitiveDef {
  return REALITY_PRIMITIVE_DEFS[id];
}
