import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import type { BridgeSyncPhase } from "@/lib/experience-bridge/bridge-sync-session";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";
import { isLocalEventMedia } from "@/lib/experience-bridge/is-local-bridge-capture";
import {
  isBridgeCapturePendingRemote,
  isOwnBridgeCapture,
} from "@/lib/globe/bridge-context-media-reel-policy";
import { projectCaptureNodes } from "@/lib/experience-graph/project-experience-subgraph";
import { isBridgeSharedEvent } from "@/lib/globe/is-bridge-shared-event";

export type BridgeCompanionTone =
  | "idle"
  | "syncing"
  | "uploading"
  | "pending"
  | "ready";

export type BridgeCompanionStatus = {
  tone: BridgeCompanionTone;
  line: string;
  detailLine?: string;
  mediaCount: number;
  pendingFriendCount: number;
  ownUploadPending: boolean;
};

export function projectBridgeCompanionStatus(input: {
  event: EventCandidate | null | undefined;
  viewerUserId?: string | null;
  syncPhase?: BridgeSyncPhase;
}): BridgeCompanionStatus | null {
  const event = input.event;
  if (!event || !isBridgeSharedEvent(event)) {
    return null;
  }

  const eventId = event.id.trim();
  const viewerUserId = input.viewerUserId?.trim() || null;
  const syncPhase = input.syncPhase ?? "idle";

  let mediaCount = 0;
  let pendingFriendCount = 0;
  let ownUploadPending = false;

  for (const capture of projectCaptureNodes(event)) {
    if (capture.kind !== "photo" && capture.kind !== "video") {
      continue;
    }
    mediaCount += 1;
    const imageUrl = isUsableBridgeMediaUrl(capture.url ?? undefined)
      ? capture.url!.trim()
      : null;
    const mediaContextId = capture.mediaContextId?.trim() || null;
    const allowLocalBlob = isLocalEventMedia(eventId, mediaContextId ?? undefined);

    if (
      isBridgeCapturePendingRemote({
        bridgeShared: true,
        imageUrl,
        allowLocalBlob,
        capture,
        viewerUserId,
      })
    ) {
      pendingFriendCount += 1;
    }

    if (
      !imageUrl &&
      isOwnBridgeCapture({ capture, viewerUserId }) &&
      Boolean(mediaContextId)
    ) {
      ownUploadPending = true;
    }
  }

  if (syncPhase === "uploading" || ownUploadPending) {
    return {
      tone: "uploading",
      line: copy.globe.bridgeCompanionUploading,
      detailLine:
        pendingFriendCount > 0
          ? copy.globe.bridgeCompanionPendingFriend(pendingFriendCount)
          : undefined,
      mediaCount,
      pendingFriendCount,
      ownUploadPending: true,
    };
  }

  if (syncPhase === "syncing") {
    return {
      tone: "syncing",
      line: copy.globe.bridgeCompanionSyncing,
      detailLine:
        mediaCount > 0
          ? copy.globe.bridgeCompanionMediaCount(mediaCount)
          : undefined,
      mediaCount,
      pendingFriendCount,
      ownUploadPending: false,
    };
  }

  if (pendingFriendCount > 0) {
    return {
      tone: "pending",
      line: copy.globe.bridgeCompanionPendingFriend(pendingFriendCount),
      detailLine: copy.globe.bridgeCompanionSyncHint,
      mediaCount,
      pendingFriendCount,
      ownUploadPending: false,
    };
  }

  if (mediaCount === 0) {
    return {
      tone: "idle",
      line: copy.globe.bridgeCompanionEmpty,
      mediaCount: 0,
      pendingFriendCount: 0,
      ownUploadPending: false,
    };
  }

  return {
    tone: "ready",
    line: copy.globe.bridgeCompanionReady(mediaCount),
    detailLine: copy.globe.bridgeCompanionSyncHint,
    mediaCount,
    pendingFriendCount: 0,
    ownUploadPending: false,
  };
}
