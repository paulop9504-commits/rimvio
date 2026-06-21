import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  FOOD_ACTION_LABELS,
  FOOD_ACTION_SEQUENCE,
} from "@/lib/semantic/food-playbook";
import {
  isPlaybookStepExecuted,
  pickNextPlaybookFeature,
} from "@/lib/semantic/playbook-progress";
import { pushSemanticTriple } from "@/lib/semantic/push-semantic-triple";
import {
  SCHEDULE_ACTION_LABELS,
  SCHEDULE_ACTION_SEQUENCE,
} from "@/lib/semantic/schedule-playbook";
import { semanticActionId, semanticExperienceId } from "@/lib/semantic/semantic-id";
import type { SemanticTriple } from "@/lib/semantic/types";
import type { LearningRollupEntry } from "@/lib/archive/learning-rollup-store";

function focusHaystack(event: EventCandidate): string {
  return [event.category, event.place, event.title]
    .filter((row) => typeof row === "string" && row.trim())
    .join(" ")
    .toLowerCase();
}

function projectActionSequencePlaybook(input: {
  event: EventCandidate;
  sequence: readonly string[];
  labels: Record<string, string>;
  classId: string;
  classLabel: string;
  rollups: readonly LearningRollupEntry[];
  out: SemanticTriple[];
}): void {
  const ecId = semanticExperienceId(input.event.id);
  const title = input.event.title?.trim() || input.classLabel;
  const hay = focusHaystack(input.event);

  pushSemanticTriple(input.out, {
    subjectId: ecId,
    subjectLabel: title,
    subjectClass: "experience",
    predicate: "is_a",
    objectId: `class:${input.classId}`,
    objectLabel: input.classLabel,
    objectClass: "context",
    confidence: 0.88,
    provenance: "rule",
    reasonCode: `${input.classId}.context`,
  });

  const nextFeature = pickNextPlaybookFeature(input.sequence, input.rollups, hay);
  if (nextFeature) {
    pushSemanticTriple(input.out, {
      subjectId: ecId,
      subjectLabel: title,
      subjectClass: "experience",
      predicate: "has_intent",
      objectId: semanticActionId(nextFeature),
      objectLabel: input.labels[nextFeature] ?? nextFeature,
      objectClass: "action",
      confidence: 0.78,
      provenance: "rule",
      reasonCode: `${input.classId}.next_step`,
    });
  }

  for (let i = 0; i < input.sequence.length - 1; i += 1) {
    const fromId = input.sequence[i]!;
    const toId = input.sequence[i + 1]!;
    if (!isPlaybookStepExecuted(fromId, input.rollups, hay)) {
      continue;
    }
    if (isPlaybookStepExecuted(toId, input.rollups, hay)) {
      continue;
    }
    pushSemanticTriple(input.out, {
      subjectId: semanticActionId(fromId),
      subjectLabel: input.labels[fromId] ?? fromId,
      subjectClass: "action",
      predicate: "precedes",
      objectId: semanticActionId(toId),
      objectLabel: input.labels[toId] ?? toId,
      objectClass: "action",
      confidence: 0.8,
      provenance: "rule",
      reasonCode: `${input.classId}.${fromId}_done→${toId}`,
    });
  }
}

export function projectFoodPlaybookTriples(
  event: EventCandidate,
  rollups: readonly LearningRollupEntry[],
  out: SemanticTriple[],
): void {
  if (event.category !== "food") {
    return;
  }
  projectActionSequencePlaybook({
    event,
    sequence: FOOD_ACTION_SEQUENCE,
    labels: FOOD_ACTION_LABELS,
    classId: "food",
    classLabel: "food",
    rollups,
    out,
  });
}

export function projectSchedulePlaybookTriples(
  event: EventCandidate,
  rollups: readonly LearningRollupEntry[],
  out: SemanticTriple[],
): void {
  const isSchedule =
    event.category === "schedule" ||
    (Boolean(event.datetime?.trim()) &&
      event.category !== "travel" &&
      event.category !== "food");
  if (!isSchedule) {
    return;
  }
  projectActionSequencePlaybook({
    event,
    sequence: SCHEDULE_ACTION_SEQUENCE,
    labels: SCHEDULE_ACTION_LABELS,
    classId: "schedule",
    classLabel: "schedule",
    rollups,
    out,
  });
}
