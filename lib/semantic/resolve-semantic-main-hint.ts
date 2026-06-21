import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import {
  FOOD_ACTION_LABELS,
  FOOD_ACTION_SEQUENCE,
} from "@/lib/semantic/food-playbook";
import { pickNextPlaybookFeature } from "@/lib/semantic/playbook-progress";
import {
  SCHEDULE_ACTION_LABELS,
  SCHEDULE_ACTION_SEQUENCE,
} from "@/lib/semantic/schedule-playbook";
import { pickNextTravelHub } from "@/lib/semantic/travel-playbook";
import type { SemanticMainHint, SemanticTriple } from "@/lib/semantic/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { LearningRollupEntry } from "@/lib/archive/learning-rollup-store";

function hintFromPrecedes(
  triples: readonly SemanticTriple[],
): SemanticMainHint | null {
  const edge = triples.find((row) => row.predicate === "precedes");
  if (!edge) {
    return null;
  }
  if (edge.objectId.startsWith("hub:")) {
    return {
      hubServiceId: edge.objectId.replace(/^hub:/, ""),
      labelKo: edge.objectLabel,
      reasonCode: edge.reasonCode ?? "precedes",
      confidence: edge.confidence,
    };
  }
  if (edge.objectId.startsWith("action:")) {
    const featureId = edge.objectId.replace(/^action:/, "");
    return {
      hubServiceId: featureId,
      labelKo: edge.objectLabel,
      reasonCode: edge.reasonCode ?? "precedes",
      confidence: edge.confidence,
    };
  }
  return null;
}

function hintFromTriggers(
  triples: readonly SemanticTriple[],
): SemanticMainHint | null {
  const edge = triples.find((row) => row.predicate === "triggers");
  if (!edge) {
    return null;
  }
  if (edge.objectId.startsWith("hub:")) {
    return {
      hubServiceId: edge.objectId.replace(/^hub:/, ""),
      labelKo: edge.objectLabel,
      reasonCode: edge.reasonCode ?? "triggers",
      confidence: edge.confidence,
    };
  }
  const featureId = edge.objectId.replace(/^action:/, "");
  return {
    hubServiceId: featureId,
    labelKo: edge.objectLabel,
    reasonCode: edge.reasonCode ?? "triggers",
    confidence: edge.confidence,
  };
}

function hintFromNextHub(row: ContextHubServiceRow): SemanticMainHint {
  return {
    hubServiceId: row.serviceId,
    labelKo: row.labelKo,
    reasonCode: row.connected ? "hub.connected" : "hub.next_in_sequence",
    confidence: row.connected ? 0.95 : 0.78,
  };
}

function focusHaystack(event: EventCandidate | null): string {
  if (!event) {
    return "";
  }
  return [event.category, event.place, event.title]
    .filter((row) => typeof row === "string" && row.trim())
    .join(" ")
    .toLowerCase();
}

function hintFromDomainPlaybook(
  event: EventCandidate | null,
  rollups: readonly LearningRollupEntry[],
): SemanticMainHint | null {
  if (!event) {
    return null;
  }
  const hay = focusHaystack(event);

  if (event.category === "food") {
    const next = pickNextPlaybookFeature(FOOD_ACTION_SEQUENCE, rollups, hay);
    if (next) {
      return {
        hubServiceId: next,
        labelKo: FOOD_ACTION_LABELS[next as keyof typeof FOOD_ACTION_LABELS],
        reasonCode: "food.next_step",
        confidence: 0.78,
      };
    }
  }

  const isSchedule =
    event.category === "schedule" ||
    (Boolean(event.datetime?.trim()) &&
      event.category !== "travel" &&
      event.category !== "food");
  if (isSchedule) {
    const next = pickNextPlaybookFeature(SCHEDULE_ACTION_SEQUENCE, rollups, hay);
    if (next) {
      return {
        hubServiceId: next,
        labelKo:
          SCHEDULE_ACTION_LABELS[next as keyof typeof SCHEDULE_ACTION_LABELS],
        reasonCode: "schedule.next_step",
        confidence: 0.78,
      };
    }
  }

  return null;
}

/**
 * One next logical step for UI — no graph surface.
 * Priority: triggers → precedes → travel hub → domain playbook → has_intent.
 */
export function resolveSemanticMainHint(input: {
  semanticTriples: readonly SemanticTriple[];
  hubServices: readonly ContextHubServiceRow[];
  focusEvent?: EventCandidate | null;
  rollupEntries?: readonly LearningRollupEntry[];
}): SemanticMainHint | null {
  const fromTriggers = hintFromTriggers(input.semanticTriples);
  if (fromTriggers) {
    return fromTriggers;
  }

  const fromPrecedes = hintFromPrecedes(input.semanticTriples);
  if (fromPrecedes) {
    return fromPrecedes;
  }

  const nextHub = pickNextTravelHub(input.hubServices);
  if (nextHub) {
    return hintFromNextHub(nextHub);
  }

  const fromPlaybook = hintFromDomainPlaybook(
    input.focusEvent ?? null,
    input.rollupEntries ?? [],
  );
  if (fromPlaybook) {
    return fromPlaybook;
  }

  const intent = input.semanticTriples.find((row) => row.predicate === "has_intent");
  if (intent) {
    const featureId = intent.objectId.replace(/^action:/, "");
    return {
      hubServiceId: featureId,
      labelKo: intent.objectLabel,
      reasonCode: intent.reasonCode ?? "has_intent",
      confidence: intent.confidence,
    };
  }

  return null;
}
