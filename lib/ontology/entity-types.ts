import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import type {
  CaptureNode,
  ExperienceNode,
} from "@/lib/ontology/nodes/types";

/** L0 — canonical entity kinds in the personal ontology graph. */
export const RIMVIO_ENTITY_KINDS = [
  "experience",
  "person",
  "place",
  "capture",
  "knowledge",
  "thread",
] as const;

export type RimvioEntityKind = (typeof RIMVIO_ENTITY_KINDS)[number];

/** Stable graph node id — kind prefix prevents label collisions across kinds. */
export type RimvioEntityId = `${RimvioEntityKind}:${string}`;

export function asRimvioEntityId(
  kind: RimvioEntityKind,
  key: string,
): RimvioEntityId {
  return `${kind}:${key}` as RimvioEntityId;
}

export type ExperienceEntity = ExperienceNode & {
  entityKind: "experience";
  entityId: RimvioEntityId;
};

export type PersonEntity = {
  entityKind: "person";
  entityId: RimvioEntityId;
  label: string;
  peerThreadId?: string | null;
  rimvioId?: string | null;
};

export type PlaceEntity = {
  entityKind: "place";
  entityId: RimvioEntityId;
  label: string;
};

export type CaptureEntity = CaptureNode & {
  entityKind: "capture";
  entityId: RimvioEntityId;
};

export type KnowledgeEntityNode = KnowledgeEntity & {
  entityKind: "knowledge";
  entityId: RimvioEntityId;
};

export type ThreadKind = "bridge" | "room" | "market_dm";

export type ThreadEntity = {
  entityKind: "thread";
  entityId: RimvioEntityId;
  peerThreadId: string;
  /** Optional — Phase 1 threads omit; bridge / market DM / peer ROOM differ. */
  threadKind?: ThreadKind;
  bridgeId?: string | null;
  role?: "host" | "participant" | null;
  hostUserId?: string | null;
  experienceId?: string | null;
};

export type RimvioEntity =
  | ExperienceEntity
  | PersonEntity
  | PlaceEntity
  | CaptureEntity
  | KnowledgeEntityNode
  | ThreadEntity;
