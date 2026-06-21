import type { LearningRollupEntry } from "@/lib/archive/learning-rollup-store";

/** Map rollup actionKey / contract id → @ featureId when they differ. */
export const ROLLUP_ACTION_FEATURE_ALIASES: Record<string, string> = {
  open: "link",
  NAVIGATE: "navigate",
  MEAL_RECOMMENDATION: "meal",
  SCHEDULE_ORGANIZE: "schedule",
};

export function resolveRollupFeatureId(actionKey: string): string {
  const trimmed = actionKey.trim();
  if (!trimmed) {
    return "";
  }
  return ROLLUP_ACTION_FEATURE_ALIASES[trimmed] ?? trimmed.toLowerCase();
}

export function rollupMatchesFocusContext(
  contextKey: string,
  focusHaystack: string,
  eventCategory?: string | null,
): boolean {
  const key = contextKey.toLowerCase();
  const category = eventCategory?.trim().toLowerCase();
  if (category && key.includes(`event.${category}`)) {
    return true;
  }
  const hay = focusHaystack.trim().toLowerCase();
  if (!hay) {
    return true;
  }
  return key.includes(hay);
}

export function isPlaybookStepExecuted(
  featureId: string,
  rollups: readonly LearningRollupEntry[],
  focusHaystack: string,
): boolean {
  return rollups.some((entry) => {
    if (entry.executed < 1) {
      return false;
    }
    if (!rollupMatchesFocusContext(entry.contextKey, focusHaystack)) {
      return false;
    }
    return resolveRollupFeatureId(entry.actionKey) === featureId;
  });
}

/** First feature in sequence not yet executed (rollup-backed). */
export function pickNextPlaybookFeature(
  sequence: readonly string[],
  rollups: readonly LearningRollupEntry[],
  focusHaystack: string,
): string | null {
  for (const featureId of sequence) {
    if (!isPlaybookStepExecuted(featureId, rollups, focusHaystack)) {
      return featureId;
    }
  }
  return null;
}
