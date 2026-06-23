import { listMentionFeatures } from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import type { EventCandidateCategory } from "@/lib/events/event-candidate";
import type { ActionCategory } from "@/lib/semantic/types";

/**
 * Explicit @ registry featureId → ActionCategory (Step 1 vocabulary).
 * Every slim mention feature must appear here — validated at module load.
 */
export const FEATURE_ACTION_CATEGORY: Record<string, ActionCategory> = {
  // Movement
  navigate: "movement",
  taxi: "movement",
  parking: "movement",
  gas: "movement",
  station: "movement",
  pickup: "movement",

  // Transaction
  meal: "transaction",
  delivery: "transaction",
  link: "transaction",
  linksheet: "transaction",
  transfer: "transaction",
  dutch: "transaction",
  receipt: "transaction",
  market: "transaction",

  // Planning
  schedule: "planning",
  reminder: "planning",
  calendar: "planning",
  todo: "planning",
  manual: "planning",

  // Communication
  peer_talk: "communication",
  group_talk: "communication",
  friend_add: "communication",
  end_peer_talk: "communication",
};

const FALLBACK_BY_EVENT_CATEGORY: Partial<
  Record<EventCandidateCategory, ActionCategory>
> = {
  travel: "movement",
  food: "transaction",
  schedule: "planning",
  finance: "transaction",
  custom: "planning",
};

function assertRegistryCoverage(): void {
  for (const feature of listMentionFeatures()) {
    if (!FEATURE_ACTION_CATEGORY[feature.featureId]) {
      throw new Error(
        `FEATURE_ACTION_CATEGORY missing @ registry feature: ${feature.featureId}`,
      );
    }
  }
}

if (process.env.NODE_ENV !== "production") {
  assertRegistryCoverage();
}

export function resolveActionCategory(
  featureId: string,
  eventCategory?: EventCandidateCategory | null,
): ActionCategory {
  const mapped = FEATURE_ACTION_CATEGORY[featureId.trim()];
  if (mapped) {
    return mapped;
  }
  if (eventCategory && FALLBACK_BY_EVENT_CATEGORY[eventCategory]) {
    return FALLBACK_BY_EVENT_CATEGORY[eventCategory]!;
  }
  return "planning";
}

export function listFeatureIdsByActionCategory(
  category: ActionCategory,
): string[] {
  return Object.entries(FEATURE_ACTION_CATEGORY)
    .filter(([, value]) => value === category)
    .map(([key]) => key);
}
