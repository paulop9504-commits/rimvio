import type { ConversationEventState } from "@/lib/action-chat/conversation-event-state";
import type { IntentKernelResult } from "@/lib/intent/kernel-types";
import type {
  PersonExperienceSlice,
  UnifiedMemoryHit,
} from "@/lib/experience-context/unified-experience-context-types";
import type { PersonNode } from "@/lib/people-graph/person-types";

function formatPersonSlice(slice: PersonExperienceSlice): string {
  const placeLines = slice.places
    .slice(0, 5)
    .map((place) => `- ${place.label} (${place.eventCount}회)`)
    .join("\n");
  const experienceLines = slice.experiences
    .slice(0, 5)
    .map((row) => `- ${row.title}${row.atIso ? ` · ${row.atIso.slice(0, 10)}` : ""}`)
    .join("\n");

  return [
    `[${slice.displayName}]`,
    placeLines ? `장소:\n${placeLines}` : null,
    experienceLines ? `경험:\n${experienceLines}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Phase 2 enrichment injection — people, recall, behavior trajectory. */
export function composeUnifiedContextPromptBlock(input: {
  matchedPeople: readonly PersonNode[];
  personExperienceSlice: readonly PersonExperienceSlice[];
  memoryHits: readonly UnifiedMemoryHit[];
  behaviorKernel: IntentKernelResult;
  eventState: ConversationEventState;
}): string | null {
  const sections: string[] = [];

  if (input.matchedPeople.length > 0) {
    sections.push(
      `[UnifiedContext · People]\n${input.matchedPeople
        .slice(0, 4)
        .map((person) => `- ${person.displayName} (관계 ${person.relationshipScore.total})`)
        .join("\n")}`,
    );
  }

  if (input.personExperienceSlice.length > 0) {
    sections.push(
      `[UnifiedContext · PersonExperience]\n${input.personExperienceSlice
        .slice(0, 3)
        .map(formatPersonSlice)
        .join("\n\n")}`,
    );
  }

  if (input.memoryHits.length > 0) {
    sections.push(
      `[UnifiedContext · ConversationMemory]\n${input.memoryHits
        .slice(0, 3)
        .map(
          (hit) =>
            `- ${hit.topic}: ${hit.summary.slice(0, 120)} (score ${hit.score})`,
        )
        .join("\n")}`,
    );
  }

  const trajectory = input.behaviorKernel.state.trajectory;
  if (trajectory.strength > 0.15) {
    sections.push(
      `[UnifiedContext · BehaviorTrajectory]\n` +
        `cluster=${trajectory.dominant_cluster} · strength=${trajectory.strength.toFixed(2)} · ` +
        `mode=${input.behaviorKernel.state.interaction_mode}`,
    );
  }

  if (input.eventState.current_topic) {
    sections.push(
      `[UnifiedContext · EventKernelTopic]\n${input.eventState.current_topic}`,
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return sections.join("\n\n");
}
