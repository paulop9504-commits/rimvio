"use client";

import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { commitCaptureToEvent } from "@/lib/feed/ingest-search-capture";
import { resolveTargetEventFromSpacetime } from "@/lib/feed/resolve-target-event-from-spacetime";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { upsertMirrorProvenanceMetadata } from "@/lib/globe/mirror-provenance";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import type { PeerGlobePinPayload } from "@/lib/peer-chat/globe-pin-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** 우리 지구 핀 → 내 홈 지구본 + Feed 맥락 (동행은 planPeerThreadId로만 연결). */
export function mirrorSharedGlobePinToPersonalGlobe(input: {
  payload: PeerGlobePinPayload;
  peerThreadId: string;
  peerDisplayName?: string | null;
}): PersonalGlobePin {
  const threadId = input.peerThreadId.trim();
  if (!threadId) {
    throw new Error("peerThreadId required");
  }

  const capturedAtIso =
    input.payload.capturedAtIso.trim() || new Date().toISOString();
  const placeLabel =
    input.payload.placeLabel.trim() ||
    `${input.payload.lat.toFixed(4)}°, ${input.payload.lng.toFixed(4)}°`;

  const resolved = resolveTargetEventFromSpacetime({
    capturedAtIso,
    lat: input.payload.lat,
    lng: input.payload.lng,
    placeLabel,
    memoText: input.payload.note,
    peerThreadId: threadId,
  });

  const lineageMeta: Record<string, unknown> = {
    globePlaceConfirmed: true,
    globePlaceLat: input.payload.lat,
    globePlaceLng: input.payload.lng,
    globePlaceLabel: placeLabel,
    globePlaceCardLat: input.payload.lat,
    globePlaceCardLng: input.payload.lng,
    globePlaceCardLabel: placeLabel,
    sharedGlobePinId: input.payload.pinId,
    planPeerThreadId: threadId,
    targetingSource: "peer_shared_globe",
  };

  const peerName = input.peerDisplayName?.trim();
  if (peerName) {
    lineageMeta.planPeerDisplayName = peerName;
    lineageMeta.planMode = "group";
  }

  let event = resolved.event;
  const nowIso = new Date().toISOString();
  const originalAuthorDisplayName =
    input.payload.senderDisplayName.trim() ||
    input.peerDisplayName?.trim() ||
    undefined;
  const provenanceMetadata = upsertMirrorProvenanceMetadata({
    metadata: {
      ...event.metadata,
      ...lineageMeta,
    },
    patch: {
      resourceKind: "shared_globe_pin",
      projectionMode: "shared_mirrored",
      visibility: "private",
      viewerScope: "peer_thread",
      bridge: {
        peerThreadId: threadId,
        sharedGlobePinId: input.payload.pinId,
        ...(typeof event.metadata?.sharedGlobeId === "string" &&
        event.metadata.sharedGlobeId.trim()
          ? { sharedGlobeId: event.metadata.sharedGlobeId.trim() }
          : {}),
      },
      origin: {
        sourceKind: "peer_shared_globe_pin",
        originalAuthorDisplayName,
        authoredAtIso: capturedAtIso,
        mirroredAtIso: nowIso,
        originCaptureId: input.payload.imageUrl ? input.payload.pinId : undefined,
        originNodeId: input.payload.pinId,
      },
      integrity: {
        attribution: "friend",
        placeBasis: "direct",
        timeBasis: "direct",
        originality: "mirror_copy",
      },
      sync: {
        state: "synced",
        lastSyncedAtIso: nowIso,
      },
      permissions: {
        viewerRole: "recipient",
        editMode: "local_edits",
        reshareMode: "blocked",
        deleteMode: "local_only",
      },
      overrides: {
        titleOverridden: false,
        placeOverridden: false,
        noteOverridden: false,
      },
    },
    audit: {
      action: "peer_shared_pin_mirrored",
      actor: {
        displayName: originalAuthorDisplayName ?? null,
        role: "sender",
      },
      subject: {
        eventId: event.id,
        captureId: input.payload.imageUrl ? input.payload.pinId : null,
        nodeId: input.payload.pinId,
      },
      refs: {
        peerThreadId: threadId,
        sharedGlobePinId: input.payload.pinId,
      },
      diff: ["projection:shared_mirrored", "source:peer_shared_globe_pin"],
    },
    nowIso,
  });

  if (input.payload.imageUrl) {
    const fragment: FeedCaptureFragment = {
      id: input.payload.pinId,
      kind: input.payload.mediaKind === "video" ? "video" : "photo",
      capturedAtIso,
      placeLabel,
      url: input.payload.imageUrl,
    };
    const result = commitCaptureToEvent({
      target: {
        ...event,
        place: placeLabel,
        metadata: provenanceMetadata,
      },
      match: resolved.match,
      createdNewEvent: resolved.createdNewEvent,
      fragment,
      userConfirmedTarget: true,
    });
    event = result.event;
  } else {
    event = commitEventUpsert({
      ...event,
      place: placeLabel,
      metadata: provenanceMetadata,
    });
  }

  const { pin } = createPersonalGlobePinFromEvent({
    event,
    experienceTitle: placeLabel,
    shareWithPeerThreadIds: [threadId],
  });

  return syncPersonalGlobePinFromEvent(event.id) ?? pin;
}
