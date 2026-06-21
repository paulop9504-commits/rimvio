import type { ContextHubServiceId } from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";

/** Deterministic travel hub order — UI shows only the first eligible next step. */
export const TRAVEL_HUB_SEQUENCE: readonly ContextHubServiceId[] = [
  "flight",
  "lodging",
  "rental_car",
] as const;

/** First offered hub in travel sequence that is not yet connected. */
export function pickNextTravelHub(
  services: readonly ContextHubServiceRow[],
): ContextHubServiceRow | null {
  for (const serviceId of TRAVEL_HUB_SEQUENCE) {
    const row = services.find((entry) => entry.serviceId === serviceId);
    if (!row?.offered || !row.implemented) {
      continue;
    }
    if (!row.connected) {
      return row;
    }
  }
  return null;
}

export function readTravelHubConnection(
  serviceId: ContextHubServiceId,
  services: readonly ContextHubServiceRow[],
): boolean {
  return services.find((row) => row.serviceId === serviceId)?.connected === true;
}
