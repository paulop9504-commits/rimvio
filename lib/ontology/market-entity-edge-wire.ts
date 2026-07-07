import type { EventCandidate } from "@/lib/events/event-candidate";

export const ONTOLOGY_MARKET_COMPLETION_META_KEY = "marketCompletion" as const;

export type OntologyMarketHandshakeWire = {
  id: string;
  seekingUserId: string;
  listingUserId: string;
  phase: string;
  completedAtIso?: string | null;
};

export type OntologyMarketCompletionPartners = {
  handshakeId: string;
  seekingUserId: string;
  listingUserId: string;
};

/** Pure read — partner ids for entity graph materialization. */
export function readOntologyMarketCompletionPartners(
  event: EventCandidate,
): OntologyMarketCompletionPartners | null {
  const raw = event.metadata?.[ONTOLOGY_MARKET_COMPLETION_META_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const handshakeId =
    typeof row.handshakeId === "string" ? row.handshakeId.trim() : "";
  const seekingUserId =
    typeof row.seekingUserId === "string" ? row.seekingUserId.trim() : "";
  const listingUserId =
    typeof row.listingUserId === "string" ? row.listingUserId.trim() : "";
  if (!handshakeId || !seekingUserId || !listingUserId) {
    return null;
  }
  return { handshakeId, seekingUserId, listingUserId };
}
