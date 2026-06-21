/** Read-only semantic projection — closed vocabulary (see docs/RIMVIO_SEMANTIC_LAYER.md). */

export const RIMVIO_ENTITY_CLASSES = [
  "action",
  "experience",
  "context",
  "resource_hub",
  "entity",
] as const;

export type RimvioEntityClass = (typeof RIMVIO_ENTITY_CLASSES)[number];

export const RIMVIO_PREDICATES = [
  "is_a",
  "occurs_in",
  "part_of",
  "has_intent",
  "requires_hub",
  "precedes",
  "follows",
  "triggers",
] as const;

export type RimvioPredicate = (typeof RIMVIO_PREDICATES)[number];

export const ACTION_CATEGORIES = [
  "transaction",
  "movement",
  "planning",
  "communication",
] as const;

export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

export type SemanticProvenance = "rule" | "hub_playbook" | "rollup";

export type SemanticTriple = {
  subjectId: string;
  subjectLabel: string;
  subjectClass: RimvioEntityClass;
  predicate: RimvioPredicate;
  objectId: string;
  objectLabel: string;
  objectClass: RimvioEntityClass;
  confidence: number;
  provenance: SemanticProvenance;
  reasonCode?: string;
};

/** One logical next step — keeps UI to a single hero (no graph UI). */
export type SemanticMainHint = {
  hubServiceId: string;
  labelKo: string;
  reasonCode: string;
  confidence: number;
};
