import type { EventCandidate } from "@/lib/events/event-candidate";
import { collectEventPeople } from "@/lib/people-graph/collect-event-people";
import { queryEntityNeighbors } from "@/lib/ontology/graph-query";
import { asRimvioEntityId } from "@/lib/ontology/entity-types";
import { describeSolidProjectionNodeSemantic } from "@/lib/situation-projection/ontology-semantic";
import type { SolidProjectionNode } from "@/lib/situation-projection/types";

function solidNodeFromEvent(event: EventCandidate): SolidProjectionNode {
  const semantic = describeSolidProjectionNodeSemantic({
    eventId: event.id,
    id: `solid:experience:${event.id}`,
  });
  return {
    kind: "solid",
    id: `solid:experience:${event.id}`,
    entityId: asRimvioEntityId("experience", event.id),
    eventId: event.id,
    label: event.title.trim() || "맥락",
    evidenceEventIds: [event.id],
    semanticType: semantic.semanticType,
    semanticTypeLabelKo: semantic.semanticTypeLabelKo,
    ontologyRole: semantic.ontologyRole,
    relationLabelKo: semantic.relationLabelKo,
    relationReasonKo: semantic.relationReasonKo,
  };
}

/** Read committed anchors for projection — never creates ghost nodes. */
export function readSolidAnchorsForEvent(event: EventCandidate): SolidProjectionNode[] {
  const rootNode = solidNodeFromEvent(event);
  const nodes: SolidProjectionNode[] = [rootNode];
  const seen = new Set<string>([rootNode.id]);

  if (event.place?.trim()) {
    const placeId = asRimvioEntityId("place", event.place.trim().toLowerCase());
    const id = `solid:place:${placeId}`;
    if (!seen.has(id)) {
      seen.add(id);
      const semantic = describeSolidProjectionNodeSemantic({ entityId: placeId, id });
      nodes.push({
        kind: "solid",
        id,
        entityId: placeId,
        label: event.place.trim(),
        evidenceEventIds: [event.id],
        semanticType: semantic.semanticType,
        semanticTypeLabelKo: semantic.semanticTypeLabelKo,
        ontologyRole: semantic.ontologyRole,
        relationLabelKo: semantic.relationLabelKo,
        relationReasonKo: semantic.relationReasonKo,
      });
    }
  }

  for (const person of collectEventPeople(event)) {
    const personId = asRimvioEntityId("person", person.toLowerCase());
    const id = `solid:person:${personId}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const semantic = describeSolidProjectionNodeSemantic({ entityId: personId, id });
    nodes.push({
      kind: "solid",
      id,
      entityId: personId,
      label: person,
      evidenceEventIds: [event.id],
      semanticType: semantic.semanticType,
      semanticTypeLabelKo: semantic.semanticTypeLabelKo,
      ontologyRole: semantic.ontologyRole,
      relationLabelKo: semantic.relationLabelKo,
      relationReasonKo: semantic.relationReasonKo,
    });
  }

  const experienceEntityId = asRimvioEntityId("experience", event.id);
  const neighborEdges = queryEntityNeighbors({
    entityId: experienceEntityId,
    recallSafe: true,
  }).slice(0, 8);

  for (const edge of neighborEdges) {
    const id = `solid:neighbor:${edge.id}`;
    if (seen.has(id)) {
      continue;
    }
    const neighborEntityId =
      edge.fromEntityId === experienceEntityId
        ? edge.toEntityId
        : edge.fromEntityId;
    const label = neighborEntityId.split(":").slice(1).join(":") || "연결";
    const evidenceEventIds = edge.evidence
      .filter((row) => row.type === "event")
      .map((row) => row.id);
    if (evidenceEventIds.length === 0) {
      continue;
    }
    seen.add(id);
    const semantic = describeSolidProjectionNodeSemantic({
      entityId: neighborEntityId,
      id,
      relationReasonKo: "이미 남아 있는 연결",
    });
    nodes.push({
      kind: "solid",
      id,
      entityId: neighborEntityId,
      label,
      evidenceEventIds,
      semanticType: semantic.semanticType,
      semanticTypeLabelKo: semantic.semanticTypeLabelKo,
      ontologyRole: semantic.ontologyRole,
      relationLabelKo: semantic.relationLabelKo,
      relationReasonKo: semantic.relationReasonKo,
    });
  }

  return nodes;
}
