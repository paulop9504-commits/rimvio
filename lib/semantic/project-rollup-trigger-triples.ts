import type { LearningRollupEntry } from "@/lib/archive/learning-rollup-store";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { FOOD_ACTION_LABELS, FOOD_ACTION_SEQUENCE } from "@/lib/semantic/food-playbook";
import {
  resolveRollupFeatureId,
  rollupMatchesFocusContext,
} from "@/lib/semantic/playbook-progress";
import { pushSemanticTriple } from "@/lib/semantic/push-semantic-triple";
import {
  SCHEDULE_ACTION_LABELS,
  SCHEDULE_ACTION_SEQUENCE,
} from "@/lib/semantic/schedule-playbook";
import { semanticActionId } from "@/lib/semantic/semantic-id";
import type { SemanticTriple } from "@/lib/semantic/types";

const PLAYBOOK_SEQUENCES: readonly (readonly string[])[] = [
  FOOD_ACTION_SEQUENCE,
  SCHEDULE_ACTION_SEQUENCE,
];

function labelForFeature(featureId: string): string {
  return (
    FOOD_ACTION_LABELS[featureId as keyof typeof FOOD_ACTION_LABELS] ??
    SCHEDULE_ACTION_LABELS[featureId as keyof typeof SCHEDULE_ACTION_LABELS] ??
    featureId
  );
}

function nextInSequence(
  sequence: readonly string[],
  featureId: string,
): string | null {
  const index = sequence.indexOf(featureId);
  if (index < 0 || index >= sequence.length - 1) {
    return null;
  }
  return sequence[index + 1] ?? null;
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

/** Rollup execute → triggers next playbook step (read-only). */
export function projectRollupTriggerTriples(input: {
  focusEvent: EventCandidate | null;
  rollupEntries: readonly LearningRollupEntry[];
}): SemanticTriple[] {
  const out: SemanticTriple[] = [];
  const hay = focusHaystack(input.focusEvent);

  for (const entry of input.rollupEntries) {
    if (entry.executed < 1) {
      continue;
    }
    if (!rollupMatchesFocusContext(entry.contextKey, hay, input.focusEvent?.category)) {
      continue;
    }

    const featureId = resolveRollupFeatureId(entry.actionKey);
    if (!featureId) {
      continue;
    }

    for (const sequence of PLAYBOOK_SEQUENCES) {
      const nextFeature = nextInSequence(sequence, featureId);
      if (!nextFeature) {
        continue;
      }
      pushSemanticTriple(out, {
        subjectId: semanticActionId(featureId),
        subjectLabel: entry.label.trim() || labelForFeature(featureId),
        subjectClass: "action",
        predicate: "triggers",
        objectId: semanticActionId(nextFeature),
        objectLabel: labelForFeature(nextFeature),
        objectClass: "action",
        confidence: Math.min(0.95, 0.55 + entry.rates.executeRate * 0.4),
        provenance: "rollup",
        reasonCode: `rollup.executed→${nextFeature}`,
      });
    }
  }

  return out;
}
