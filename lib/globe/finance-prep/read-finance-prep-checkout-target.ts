import type { EventCandidate } from "@/lib/events/event-candidate";
import { CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY } from "@/lib/globe/context-pinned-item";

export function readPinnedLodgingPlaceId(
  event: EventCandidate | null | undefined,
): string | null {
  const raw = event?.metadata?.[CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
