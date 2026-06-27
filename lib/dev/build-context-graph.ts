import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ConversationMemoryWire } from "@/lib/conversation-memory/types";
import type { PeopleGraph } from "@/lib/people-graph/person-types";
import type {
  ContextGraphEdge,
  ContextGraphNode,
} from "@/lib/dev/context-snapshot-types";
import { GLOBE_CONTEXT_VISIBILITY_EXTERNAL } from "@/lib/globe/globe-context-visibility";
import { readPinScopeFromMetadata } from "@/lib/globe/stamp-universal-pin-metadata";

function tokenize(label: string): string[] {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((part) => part.length >= 2);
}

export function buildContextGraph(input: {
  events: readonly EventCandidate[];
  peopleGraph: PeopleGraph;
  memories: readonly ConversationMemoryWire[];
  pinEventIds: ReadonlySet<string>;
  externalPinEventIds: ReadonlySet<string>;
}): { nodes: ContextGraphNode[]; edges: ContextGraphEdge[] } {
  const nodes: ContextGraphNode[] = [];
  const edges: ContextGraphEdge[] = [];

  for (const event of input.events.slice(0, 40)) {
    const eventNodeId = `event:${event.id}`;
    nodes.push({
      id: eventNodeId,
      kind: "event",
      label: event.title,
      detail: `${event.category} · ${event.lifecycle}`,
      searchTokens: tokenize(`${event.title} ${event.place ?? ""}`),
    });

    if (event.place?.trim()) {
      const placeId = `place:${event.place.trim()}`;
      if (!nodes.some((node) => node.id === placeId)) {
        nodes.push({
          id: placeId,
          kind: "place",
          label: event.place.trim(),
          searchTokens: tokenize(event.place),
        });
      }
      edges.push({
        id: `edge:${eventNodeId}:${placeId}`,
        from: eventNodeId,
        to: placeId,
        label: "at",
      });
    }

    if (input.pinEventIds.has(event.id)) {
      const pinId = `pin:${event.id}`;
      nodes.push({
        id: pinId,
        kind: "pin",
        label: `Pin · ${event.title.slice(0, 24)}`,
        detail: readPinScopeFromMetadata(event.metadata),
        searchTokens: tokenize(event.title),
      });
      edges.push({
        id: `edge:${eventNodeId}:${pinId}`,
        from: eventNodeId,
        to: pinId,
        label: "has_pin",
      });
    }

    if (
      event.metadata?.globeContextVisibility === GLOBE_CONTEXT_VISIBILITY_EXTERNAL ||
      input.externalPinEventIds.has(event.id)
    ) {
      const extId = `external:${event.id}`;
      nodes.push({
        id: extId,
        kind: "external",
        label: `External · ${event.title.slice(0, 20)}`,
        searchTokens: tokenize(event.title),
      });
      edges.push({
        id: `edge:${eventNodeId}:${extId}`,
        from: eventNodeId,
        to: extId,
        label: "projects",
      });
    }
  }

  for (const person of input.peopleGraph.people.slice(0, 30)) {
    const personId = `person:${person.id}`;
    nodes.push({
      id: personId,
      kind: "person",
      label: person.displayName,
      detail: `score ${person.relationshipScore.total}`,
      searchTokens: tokenize(person.displayName),
    });

    for (const exp of person.experiences.slice(0, 4)) {
      const eventNodeId = `event:${exp.eventId}`;
      if (nodes.some((node) => node.id === eventNodeId)) {
        edges.push({
          id: `edge:${personId}:${eventNodeId}`,
          from: personId,
          to: eventNodeId,
          label: "experienced",
        });
      }
    }
  }

  for (const memory of input.memories.slice(0, 20)) {
    const memoryId = `memory:${memory.id}`;
    nodes.push({
      id: memoryId,
      kind: "memory",
      label: memory.topic,
      detail: memory.summary.slice(0, 80),
      searchTokens: tokenize(`${memory.topic} ${memory.summary} ${memory.keywords.join(" ")}`),
    });
  }

  return { nodes, edges };
}
