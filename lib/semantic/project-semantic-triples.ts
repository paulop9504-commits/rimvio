import type { LearningRollupEntry } from "@/lib/archive/learning-rollup-store";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  listContextHubServicesForEvent,
  type ContextHubServicesForEvent,
} from "@/lib/globe/context-hub/context-hub-service-catalog";
import { collectEventPeople } from "@/lib/people-graph/collect-event-people";
import {
  projectFoodPlaybookTriples,
  projectSchedulePlaybookTriples,
} from "@/lib/semantic/project-playbook-triples";
import { projectRollupTriggerTriples } from "@/lib/semantic/project-rollup-trigger-triples";
import { pushSemanticTriple } from "@/lib/semantic/push-semantic-triple";
import {
  semanticActionId,
  semanticContextId,
  semanticExperienceId,
  semanticHubId,
  semanticPersonId,
  semanticPlaceId,
} from "@/lib/semantic/semantic-id";
import {
  readTravelHubConnection,
  TRAVEL_HUB_SEQUENCE,
} from "@/lib/semantic/travel-playbook";
import type { SemanticTriple } from "@/lib/semantic/types";

const MAX_TRIPLES = 32;

function isTravelExperience(event: EventCandidate): boolean {
  return event.category === "travel" || event.metadata?.feedPlanEnabled === true;
}

function projectExperienceClass(
  event: EventCandidate,
  out: SemanticTriple[],
): void {
  const ecId = semanticExperienceId(event.id);
  const title = event.title?.trim() || "경험";
  const category = event.category?.trim() || "custom";

  pushSemanticTriple(out, {
    subjectId: ecId,
    subjectLabel: title,
    subjectClass: "experience",
    predicate: "is_a",
    objectId: `class:${category}`,
    objectLabel: category,
    objectClass: "context",
    confidence: 0.92,
    provenance: "rule",
    reasonCode: "event.category",
  });

  const place = event.place?.trim();
  if (place) {
    pushSemanticTriple(out, {
      subjectId: ecId,
      subjectLabel: title,
      subjectClass: "experience",
      predicate: "occurs_in",
      objectId: semanticPlaceId(place),
      objectLabel: place,
      objectClass: "entity",
      confidence: 0.88,
      provenance: "rule",
      reasonCode: "event.place",
    });
  }

  for (const person of collectEventPeople(event)) {
    pushSemanticTriple(out, {
      subjectId: semanticPersonId(person),
      subjectLabel: person,
      subjectClass: "entity",
      predicate: "part_of",
      objectId: ecId,
      objectLabel: title,
      objectClass: "experience",
      confidence: 0.85,
      provenance: "rule",
      reasonCode: "event.people",
    });
  }
}

function projectTravelHubTriples(
  event: EventCandidate,
  hubBundle: ContextHubServicesForEvent,
  out: SemanticTriple[],
): void {
  const ecId = semanticExperienceId(event.id);
  const title = event.title?.trim() || "여행";
  const ctxId = semanticContextId(event.id);
  const services = hubBundle.services;

  pushSemanticTriple(out, {
    subjectId: ecId,
    subjectLabel: title,
    subjectClass: "experience",
    predicate: "is_a",
    objectId: "class:travel",
    objectLabel: "travel",
    objectClass: "context",
    confidence: 0.9,
    provenance: "rule",
    reasonCode: "travel.context",
  });

  pushSemanticTriple(out, {
    subjectId: ecId,
    subjectLabel: title,
    subjectClass: "experience",
    predicate: "has_intent",
    objectId: semanticActionId("schedule"),
    objectLabel: "일정정리",
    objectClass: "action",
    confidence: 0.75,
    provenance: "hub_playbook",
    reasonCode: "travel.default_intent",
  });

  for (const row of services) {
    if (!row.offered || !row.implemented) {
      continue;
    }
    pushSemanticTriple(out, {
      subjectId: ctxId,
      subjectLabel: hubBundle.contextPlace,
      subjectClass: "context",
      predicate: "requires_hub",
      objectId: semanticHubId(row.serviceId),
      objectLabel: row.labelKo,
      objectClass: "resource_hub",
      confidence: row.connected ? 0.95 : 0.7,
      provenance: "hub_playbook",
      reasonCode: row.connected ? "hub.connected" : "hub.offered",
    });
  }

  for (let i = 0; i < TRAVEL_HUB_SEQUENCE.length - 1; i += 1) {
    const fromId = TRAVEL_HUB_SEQUENCE[i]!;
    const toId = TRAVEL_HUB_SEQUENCE[i + 1]!;
    const fromRow = services.find((row) => row.serviceId === fromId);
    const toRow = services.find((row) => row.serviceId === toId);
    if (!fromRow?.offered || !toRow?.offered) {
      continue;
    }
    if (!readTravelHubConnection(fromId, services)) {
      continue;
    }
    if (readTravelHubConnection(toId, services)) {
      continue;
    }
    pushSemanticTriple(out, {
      subjectId: semanticHubId(fromId),
      subjectLabel: fromRow.labelKo,
      subjectClass: "resource_hub",
      predicate: "precedes",
      objectId: semanticHubId(toId),
      objectLabel: toRow.labelKo,
      objectClass: "resource_hub",
      confidence: 0.82,
      provenance: "hub_playbook",
      reasonCode: `travel.${fromId}_done→${toId}`,
    });
  }
}

/** Pure read — Subject-Predicate-Object projection for PRM meaning slice. */
export function projectSemanticTriples(input: {
  focusEvent: EventCandidate | null;
  hubServices?: ContextHubServicesForEvent | null;
  rollupEntries?: readonly LearningRollupEntry[];
}): SemanticTriple[] {
  const { focusEvent } = input;
  if (!focusEvent) {
    return [];
  }

  const rollups = input.rollupEntries ?? [];
  const out: SemanticTriple[] = [];

  projectExperienceClass(focusEvent, out);

  const hubBundle =
    input.hubServices ?? listContextHubServicesForEvent(focusEvent);

  if (hubBundle && isTravelExperience(focusEvent)) {
    projectTravelHubTriples(focusEvent, hubBundle, out);
  }

  projectFoodPlaybookTriples(focusEvent, rollups, out);
  projectSchedulePlaybookTriples(focusEvent, rollups, out);

  for (const triple of projectRollupTriggerTriples({
    focusEvent,
    rollupEntries: rollups,
  })) {
    pushSemanticTriple(out, triple, MAX_TRIPLES);
  }

  return out;
}
