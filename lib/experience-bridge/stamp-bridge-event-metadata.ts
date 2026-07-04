"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ExperienceBridgeSnapshot } from "@/lib/experience-bridge/experience-bridge-types";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { upsertMirrorProvenanceMetadata } from "@/lib/globe/mirror-provenance";
import { readLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** Persist bridge link on local event — host + invitee can publish/sync media. */
export function stampBridgeEventMetadata(input: {
  event: EventCandidate;
  bridge: ExperienceBridgeSnapshot;
  role: "host" | "participant";
  /** Participant accept — stamps participant rimvio user id for graph materialize. */
  participantUserId?: string | null;
  hostDisplayName?: string | null;
}): EventCandidate {
  const meta = input.event.metadata ?? {};
  const bridgeId = input.bridge.eventId.trim();
  const hostUserId = input.bridge.hostUserId.trim();
  const peerThreadId = input.bridge.peerThreadId?.trim() || undefined;
  const participant = input.role === "participant";

  const alreadyStamped =
    meta[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === bridgeId &&
    meta[EXPERIENCE_BRIDGE_META_KEYS.hostUserId] === hostUserId &&
    (peerThreadId
      ? meta[EXPERIENCE_BRIDGE_META_KEYS.peerThreadId] === peerThreadId
      : !meta[EXPERIENCE_BRIDGE_META_KEYS.peerThreadId]) &&
    (participant
      ? meta.experienceBridgeParticipant === true
      : meta.experienceBridgeHost === true);

  if (alreadyStamped) {
    return input.event;
  }

  const nowIso = new Date().toISOString();
  const sharedGlobeId =
    typeof meta.sharedGlobeId === "string" && meta.sharedGlobeId.trim()
      ? meta.sharedGlobeId.trim()
      : undefined;
  const sharedGlobePinId =
    typeof meta.sharedGlobePinId === "string" && meta.sharedGlobePinId.trim()
      ? meta.sharedGlobePinId.trim()
      : undefined;
  const authoredAtIso =
    input.bridge.eventSnapshot.datetime?.trim() ||
    input.bridge.eventSnapshot.createdAt ||
    input.event.datetime?.trim() ||
    input.event.createdAt ||
    nowIso;
  const provenanceMetadata = upsertMirrorProvenanceMetadata({
    metadata: {
      ...input.event.metadata,
      [EXPERIENCE_BRIDGE_META_KEYS.bridgeId]: input.bridge.eventId,
      [EXPERIENCE_BRIDGE_META_KEYS.hostUserId]: input.bridge.hostUserId,
      ...(input.bridge.peerThreadId?.trim()
        ? { [EXPERIENCE_BRIDGE_META_KEYS.peerThreadId]: input.bridge.peerThreadId.trim() }
        : {}),
      ...(input.role === "participant"
        ? {
            experienceBridgeParticipant: true,
            ...(input.participantUserId?.trim()
              ? {
                  [EXPERIENCE_BRIDGE_META_KEYS.participantUserId]:
                    input.participantUserId.trim(),
                }
              : {}),
          }
        : { experienceBridgeHost: true }),
    },
    patch: {
      resourceKind: "globe_context",
      projectionMode: input.role === "participant" ? "shared_mirrored" : "shared",
      visibility: "private",
      viewerScope:
        input.role === "participant" ? "bridge_participants" : "bridge_participants",
      bridge: {
        bridgeId,
        ...(peerThreadId ? { peerThreadId } : {}),
        ...(sharedGlobeId ? { sharedGlobeId } : {}),
        ...(sharedGlobePinId ? { sharedGlobePinId } : {}),
      },
      origin: {
        sourceKind:
          input.role === "participant" ? "bridge_participant" : "bridge_share",
        originalAuthorUserId: hostUserId || undefined,
        originalAuthorDisplayName: input.hostDisplayName?.trim() || undefined,
        authoredAtIso,
        mirroredAtIso: input.role === "participant" ? nowIso : undefined,
        originEventId: input.bridge.eventSnapshot.id || input.event.id,
      },
      integrity: {
        attribution: input.role === "participant" ? "bridge_host" : "self",
        placeBasis: input.role === "participant" ? "shared" : "direct",
        timeBasis: input.role === "participant" ? "shared" : "direct",
        originality: input.role === "participant" ? "mirror_copy" : "original",
      },
      sync: {
        state: "synced",
        lastSyncedAtIso: nowIso,
      },
      permissions: {
        viewerRole: input.role === "participant" ? "participant" : "host",
        editMode: input.role === "participant" ? "local_edits" : "owner_only",
        reshareMode: input.role === "participant" ? "owner_only" : "allowed",
        deleteMode: input.role === "participant" ? "local_only" : "owner_only",
      },
      overrides: {
        titleOverridden: false,
        placeOverridden: false,
        noteOverridden: false,
      },
    },
    audit: {
      action:
        input.role === "participant"
          ? "bridge_participant_mirrored"
          : "bridge_shared",
      actor: {
        userId:
          input.role === "participant"
            ? input.participantUserId?.trim() || null
            : hostUserId || null,
        displayName:
          input.role === "participant"
            ? null
            : input.hostDisplayName?.trim() || null,
        role: input.role,
      },
      subject: {
        eventId: input.event.id,
        nodeId: input.bridge.eventSnapshot.id || input.event.id,
      },
      refs: {
        bridgeId,
        ...(peerThreadId ? { peerThreadId } : {}),
        ...(sharedGlobeId ? { sharedGlobeId } : {}),
        ...(sharedGlobePinId ? { sharedGlobePinId } : {}),
      },
      diff:
        input.role === "participant"
          ? ["projection:shared_mirrored", "viewerRole:participant"]
          : ["projection:shared", "viewerRole:host"],
    },
    nowIso,
  });

  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata: provenanceMetadata,
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt ?? new Date().toISOString(),
  });
}

export function isBridgeLinkedEventId(eventId: string): boolean {
  const key = eventId.trim();
  if (!key) {
    return false;
  }
  if (readLocalBridgeState(key)) {
    return true;
  }
  const event = findLifeEventCandidate(key);
  if (!event) {
    return false;
  }
  if (
    event.metadata?.experienceBridgeParticipant === true ||
    event.metadata?.experienceBridgeHost === true
  ) {
    return true;
  }
  return typeof event.metadata?.[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === "string";
}
