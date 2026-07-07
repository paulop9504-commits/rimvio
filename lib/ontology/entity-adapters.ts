import type { EventCandidate } from "@/lib/events/event-candidate";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import {
  normalizeMeaningPerson,
  normalizeMeaningPlace,
} from "@/lib/meaning/meaning-node-id";
import { collectEventPeople } from "@/lib/people-graph/collect-event-people";
import { projectExperienceSubgraph } from "@/lib/ontology/project-event-experience-nodes";
import type {
  BridgeNode,
  ExperienceNode,
} from "@/lib/ontology/nodes/types";
import {
  asRimvioEntityId,
  type CaptureEntity,
  type ExperienceEntity,
  type KnowledgeEntityNode,
  type PersonEntity,
  type PlaceEntity,
  type RimvioEntity,
  type ThreadEntity,
} from "@/lib/ontology/entity-types";

export type OntologyExperiencePinWire = {
  eventId: string;
  title: string;
  location: { placeLabel?: string | null };
  startedAtIso?: string | null;
  createdAtIso: string;
};

export function entityFromExperienceNode(experience: ExperienceNode): ExperienceEntity {
  return {
    ...experience,
    entityKind: "experience",
    entityId: asRimvioEntityId("experience", experience.id),
  };
}

export function entityFromPersonLabel(
  label: string,
  options?: { peerThreadId?: string | null; rimvioId?: string | null },
): PersonEntity {
  const normalized = normalizeMeaningPerson(label);
  return {
    entityKind: "person",
    entityId: asRimvioEntityId("person", normalized.toLowerCase()),
    label: normalized,
    peerThreadId: options?.peerThreadId ?? null,
    rimvioId: options?.rimvioId ?? null,
  };
}

export function entityFromPlaceLabel(label: string): PlaceEntity {
  const normalized = normalizeMeaningPlace(label);
  return {
    entityKind: "place",
    entityId: asRimvioEntityId("place", normalized.toLowerCase()),
    label: normalized,
  };
}

export function entityFromCaptureNode(
  capture: import("@/lib/ontology/nodes/types").CaptureNode,
): CaptureEntity {
  return {
    ...capture,
    entityKind: "capture",
    entityId: asRimvioEntityId("capture", capture.id),
  };
}

export function entityFromKnowledgeEntity(row: KnowledgeEntity): KnowledgeEntityNode {
  return {
    ...row,
    entityKind: "knowledge",
    entityId: asRimvioEntityId("knowledge", `${row.type}:${row.id}`),
  };
}

export function entityFromBridgeNode(bridge: BridgeNode): ThreadEntity | null {
  const peerThreadId = bridge.peerThreadId?.trim();
  if (!peerThreadId) {
    return null;
  }
  return {
    entityKind: "thread",
    entityId: asRimvioEntityId("thread", peerThreadId),
    peerThreadId,
    threadKind: "bridge",
    bridgeId: bridge.bridgeId,
    role: bridge.role,
    hostUserId: bridge.hostUserId,
    experienceId: bridge.experienceId,
  };
}

/** EventCandidate → graph entities (adapters only — no schema mutation). */
export function entitiesFromEventCandidate(event: EventCandidate): RimvioEntity[] {
  const subgraph = projectExperienceSubgraph(event);
  const entities: RimvioEntity[] = [
    entityFromExperienceNode(subgraph.experience),
  ];

  for (const name of collectEventPeople(event)) {
    entities.push(entityFromPersonLabel(name));
  }

  const placeLabels = new Set<string>();
  if (event.place?.trim()) {
    placeLabels.add(normalizeMeaningPlace(event.place));
  }
  for (const capture of subgraph.captures) {
    if (capture.placeLabel?.trim()) {
      placeLabels.add(normalizeMeaningPlace(capture.placeLabel));
    }
    entities.push(entityFromCaptureNode(capture));
  }
  for (const place of placeLabels) {
    if (place) {
      entities.push(entityFromPlaceLabel(place));
    }
  }

  const thread = subgraph.bridge ? entityFromBridgeNode(subgraph.bridge) : null;
  if (thread) {
    entities.push(thread);
  }

  return entities;
}

/** Pin projection → experience entity via linked event id. */
export function entityFromPinEntity(pin: OntologyExperiencePinWire): ExperienceEntity {
  return {
    objectKind: "experience",
    id: pin.eventId,
    title: pin.title.trim(),
    category: "custom",
    lifecycle: "completed",
    place: pin.location.placeLabel?.trim() || null,
    datetime: pin.startedAtIso ?? pin.createdAtIso,
    entityKind: "experience",
    entityId: asRimvioEntityId("experience", pin.eventId),
  };
}
