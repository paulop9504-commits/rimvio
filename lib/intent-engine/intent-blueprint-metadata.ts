import type { EventCandidate } from "@/lib/events/event-candidate";
import type { IntentBlueprint } from "@/lib/intent-engine/types";
import { INTENT_ENGINE_VERSION } from "@/lib/intent-engine/types";

export const INTENT_BLUEPRINT_META_KEY = "intentBlueprintV1" as const;

export function isIntentBlueprint(value: unknown): value is IntentBlueprint {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<IntentBlueprint>;
  return (
    row.version === INTENT_ENGINE_VERSION &&
    typeof row.sourceText === "string" &&
    Array.isArray(row.intents) &&
    Array.isArray(row.mood) &&
    typeof row.mergedProfile === "object" &&
    row.mergedProfile != null
  );
}

export function readIntentBlueprintFromEvent(
  event: EventCandidate | null | undefined,
): IntentBlueprint | null {
  if (!event?.metadata) {
    return null;
  }
  const raw = event.metadata[INTENT_BLUEPRINT_META_KEY];
  return isIntentBlueprint(raw) ? raw : null;
}

export function stampIntentBlueprintMetadata(
  metadata: Record<string, unknown> | null | undefined,
  blueprint: IntentBlueprint,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [INTENT_BLUEPRINT_META_KEY]: blueprint,
  };
}
