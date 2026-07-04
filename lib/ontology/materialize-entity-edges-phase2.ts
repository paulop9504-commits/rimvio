/**
 * Phase 2 entity edge writers — Market / Bridge / External (gathering read-only).
 * See docs/adr/003-personal-ontology-graph.md § Extension.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readMarketCompletionMeta } from "@/lib/globe/market/market-completion-metadata";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/ontology/experience-bridge-meta-keys";
import { isBridgeSharedEvent } from "@/lib/ontology/is-bridge-shared-event";
import { entityEdgeId } from "@/lib/ontology/entity-edge-id";
import { upsertEntityEdge } from "@/lib/ontology/edge-store";
import type { EntityEdge, EntityEdgeEvidence } from "@/lib/ontology/edge-types";
import { asRimvioEntityId, type RimvioEntityId } from "@/lib/ontology/entity-types";

const TRADE_PARTNER_WEIGHT = 72;
const CO_PARTICIPANT_WEIGHT = 68;

export function personEntityIdFromUserId(userId: string): RimvioEntityId | null {
  const key = userId.trim().toLowerCase();
  if (!key) {
    return null;
  }
  return asRimvioEntityId("person", key);
}

function buildSymmetricPersonEdge(input: {
  kind: EntityEdge["kind"];
  leftUserId: string;
  rightUserId: string;
  evidence: EntityEdgeEvidence[];
  atIso: string;
  weight: number;
}): EntityEdge | null {
  const fromEntityId = personEntityIdFromUserId(input.leftUserId);
  const toEntityId = personEntityIdFromUserId(input.rightUserId);
  if (!fromEntityId || !toEntityId || fromEntityId === toEntityId) {
    return null;
  }
  if (input.evidence.length === 0) {
    return null;
  }
  return {
    id: entityEdgeId(input.kind, fromEntityId, toEntityId),
    kind: input.kind,
    fromEntityId,
    toEntityId,
    weight: input.weight,
    evidence: input.evidence,
    createdAt: input.atIso,
    updatedAt: input.atIso,
  };
}

export function buildTradePartnerEdge(input: {
  seekingUserId: string;
  listingUserId: string;
  handshakeId: string;
  eventId?: string | null;
  atIso: string;
}): EntityEdge | null {
  const handshakeId = input.handshakeId.trim();
  if (!handshakeId) {
    return null;
  }
  const evidence: EntityEdgeEvidence[] = [{ type: "trade", id: handshakeId }];
  const eventId = input.eventId?.trim();
  if (eventId) {
    evidence.push({ type: "event", id: eventId });
  }
  return buildSymmetricPersonEdge({
    kind: "trade_partner",
    leftUserId: input.seekingUserId,
    rightUserId: input.listingUserId,
    evidence,
    atIso: input.atIso,
    weight: TRADE_PARTNER_WEIGHT,
  });
}

/** (B) Market handshake complete — Supabase SSOT outside EventCandidate; persists to personal graph. */
export function materializeMarketEdge(
  handshake: MarketHandshakeRecord,
  options?: { eventId?: string | null; atIso?: string; persist?: boolean },
): EntityEdge | null {
  if (handshake.phase !== "completed") {
    return null;
  }
  const edge = buildTradePartnerEdge({
    seekingUserId: handshake.seekingUserId,
    listingUserId: handshake.listingUserId,
    handshakeId: handshake.id,
    eventId: options?.eventId,
    atIso: options?.atIso ?? handshake.completedAtIso ?? new Date().toISOString(),
  });
  if (!edge) {
    return null;
  }
  if (options?.persist !== false) {
    upsertEntityEdge(edge);
  }
  return edge;
}

/** (A) Market completion trace commit — reads partner ids from EventCandidate metadata. */
export function materializeMarketEdgeFromCompletionEvent(
  event: EventCandidate,
  atIso: string,
): EntityEdge | null {
  const meta = readMarketCompletionMeta(event);
  if (!meta?.seekingUserId || !meta.listingUserId) {
    return null;
  }
  const edge = buildTradePartnerEdge({
    seekingUserId: meta.seekingUserId,
    listingUserId: meta.listingUserId,
    handshakeId: meta.handshakeId,
    eventId: event.id,
    atIso,
  });
  if (!edge) {
    return null;
  }
  upsertEntityEdge(edge);
  return edge;
}

export function buildBridgeCoParticipantEdge(input: {
  bridgeEventId: string;
  hostUserId: string;
  participantUserId: string;
  eventId?: string | null;
  atIso: string;
}): EntityEdge | null {
  const bridgeEventId = input.bridgeEventId.trim();
  if (!bridgeEventId) {
    return null;
  }
  const evidence: EntityEdgeEvidence[] = [{ type: "bridge", id: bridgeEventId }];
  const eventId = input.eventId?.trim();
  if (eventId) {
    evidence.push({ type: "event", id: eventId });
  }
  return buildSymmetricPersonEdge({
    kind: "co_participant",
    leftUserId: input.hostUserId,
    rightUserId: input.participantUserId,
    evidence,
    atIso: input.atIso,
    weight: CO_PARTICIPANT_WEIGHT,
  });
}

export function materializeBridgeCoParticipantEdge(input: {
  bridgeEventId: string;
  hostUserId: string;
  participantUserId: string;
  eventId?: string | null;
  atIso?: string;
  persist?: boolean;
}): EntityEdge | null {
  const edge = buildBridgeCoParticipantEdge({
    ...input,
    atIso: input.atIso ?? new Date().toISOString(),
  });
  if (!edge) {
    return null;
  }
  if (input.persist !== false) {
    upsertEntityEdge(edge);
  }
  return edge;
}

function readBridgeParticipantUserId(event: EventCandidate): string | null {
  const raw = event.metadata?.[EXPERIENCE_BRIDGE_META_KEYS.participantUserId];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/** (A) Bridge accept commit — host + participant ids from event metadata. */
export function materializeBridgeCoParticipantEdgeFromEvent(
  event: EventCandidate,
  atIso: string,
): EntityEdge | null {
  if (!isBridgeSharedEvent(event)) {
    return null;
  }
  const meta = event.metadata ?? {};
  const hostRaw = meta[EXPERIENCE_BRIDGE_META_KEYS.hostUserId];
  const hostUserId = typeof hostRaw === "string" ? hostRaw.trim() : "";
  if (!hostUserId) {
    return null;
  }
  const bridgeRaw = meta[EXPERIENCE_BRIDGE_META_KEYS.bridgeId];
  const bridgeEventId =
    typeof bridgeRaw === "string" && bridgeRaw.trim() ? bridgeRaw.trim() : event.id;

  const participantUserId = readBridgeParticipantUserId(event);
  if (!participantUserId || meta.experienceBridgeParticipant !== true) {
    return null;
  }

  return materializeBridgeCoParticipantEdge({
    bridgeEventId,
    hostUserId,
    participantUserId,
    eventId: event.id,
    atIso,
  });
}

/**
 * External gathering — read-only projection edge; never persisted to rimvio.entity-graph.v1.
 */
export function materializeGatheringLinkEdge(input: {
  publicBridgeId: string;
  personalEventId: string;
  atIso?: string;
}): EntityEdge | null {
  const publicBridgeId = input.publicBridgeId.trim();
  const personalEventId = input.personalEventId.trim();
  if (!publicBridgeId || !personalEventId) {
    return null;
  }
  const atIso = input.atIso ?? new Date().toISOString();
  const fromEntityId = asRimvioEntityId("experience", personalEventId);
  const toEntityId = asRimvioEntityId("experience", `gathering:${publicBridgeId}`);
  const evidence: EntityEdgeEvidence[] = [
    { type: "gathering", id: publicBridgeId },
    { type: "event", id: personalEventId },
  ];
  return {
    id: entityEdgeId("gathering_link", fromEntityId, toEntityId),
    kind: "gathering_link",
    fromEntityId,
    toEntityId,
    weight: 40,
    evidence,
    createdAt: atIso,
    updatedAt: atIso,
  };
}

/** Commit hook entry — market + bridge paths only (gathering excluded). */
export function materializePhase2EntityEdgesFromEvent(
  event: EventCandidate,
  atIso: string,
): void {
  materializeMarketEdgeFromCompletionEvent(event, atIso);
  materializeBridgeCoParticipantEdgeFromEvent(event, atIso);
}
