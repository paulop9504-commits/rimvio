import type { EventCandidate } from "@/lib/events/event-candidate";
import { listLearningRollup } from "@/lib/archive/learning-rollup-store";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { projectSemanticTriples } from "@/lib/semantic/project-semantic-triples";
import { resolveSemanticMainHint } from "@/lib/semantic/resolve-semantic-main-hint";
import type { SemanticMainHint } from "@/lib/semantic/types";

/** Client/server helper — one next step for simplified UI chrome. */
export function resolveSemanticMainHintForEvent(
  event: EventCandidate | null | undefined,
): SemanticMainHint | null {
  if (!event) {
    return null;
  }
  const hubBundle = listContextHubServicesForEvent(event);
  const rollupEntries = listLearningRollup();
  const semanticTriples = projectSemanticTriples({
    focusEvent: event,
    hubServices: hubBundle,
    rollupEntries,
  });
  return resolveSemanticMainHint({
    semanticTriples,
    hubServices: hubBundle?.services ?? [],
    focusEvent: event,
    rollupEntries,
  });
}
