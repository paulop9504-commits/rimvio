import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { rankContextHubServices } from "@/lib/globe/context-hub/rank-context-hub-services";
import { resolveSemanticMainHintForEvent } from "@/lib/semantic/resolve-semantic-main-hint-for-event";

/** Collapsed hub rail — first ranked carousel slot (semantic next step when event known). */
export function resolvePrimaryHubServiceRow(
  services: readonly ContextHubServiceRow[],
  event?: EventCandidate | null,
): ContextHubServiceRow | null {
  const semanticHint = resolveSemanticMainHintForEvent(event ?? null);
  return rankContextHubServices(services, semanticHint)[0] ?? null;
}
