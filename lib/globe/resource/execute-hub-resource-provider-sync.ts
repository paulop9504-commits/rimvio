import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ApiProviderId } from "@/lib/globe/resource/api-wakeup-types";
import type { ContextResource } from "@/lib/globe/resource/types";

export type HubResourceSyncHandlerResult = {
  ok: boolean;
  skipped?: boolean;
  note?: string;
};

/** Provider-specific fetch — stubs until aviation / ingest APIs ship. */
export async function executeHubResourceProviderSync(input: {
  providerId: ApiProviderId;
  event: EventCandidate;
  resource: ContextResource;
}): Promise<HubResourceSyncHandlerResult> {
  switch (input.providerId) {
    case "flight_status":
      if (input.resource.sourceHubId !== "flight" || !input.resource.action) {
        return { ok: false, skipped: true, note: "flight_not_connected" };
      }
      return { ok: true, note: "flight_status_stub" };

    case "ticket_ingest":
      if (input.resource.sourceHubId !== "ticket") {
        return { ok: false, skipped: true, note: "not_ticket" };
      }
      if (input.resource.action) {
        return { ok: true, note: "ticket_already_connected" };
      }
      return { ok: true, note: "ticket_ingest_stub" };

    default:
      return { ok: false, skipped: true, note: "provider_not_hub_synced" };
  }
}
