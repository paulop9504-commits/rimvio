/**
 * Context capture media → Workspace 2D map pins (Reality OS).
 * Geo-linked when possible; otherwise snaps to itinerary / event fallback.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";
import { isBridgeSharedEvent } from "@/lib/globe/is-bridge-shared-event";
import {
  isBridgeCapturePendingRemote,
  shouldShowBridgeCaptureInReel,
} from "@/lib/globe/bridge-context-media-reel-policy";
import { buildGlobeContextMediaRecallCaption } from "@/lib/globe/build-context-media-recall-caption";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";
import { haversineKm } from "@/lib/geo/haversine-km";
import type { WorkspaceMapPin } from "@/lib/context-workspace/map/workspace-map-provider";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

export const WORKSPACE_CONTEXT_MEDIA_PIN_PREFIX = "ctx-media:";

export type WorkspaceContextMediaPayload = {
  readonly kind: "photo" | "video";
  readonly imageUrl: string | null;
  readonly mediaContextId: string | null;
  readonly allowLocalBlob: boolean;
  readonly recallCaption: string;
  readonly capturedAtIso: string | null;
};

function finiteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isLocalEventMedia(
  eventId: string,
  mediaContextId: string | null | undefined,
): boolean {
  const key = eventId.trim();
  const mediaId = mediaContextId?.trim();
  if (!key || !mediaId) return false;
  return readMediaContextMemorySnapshot().some(
    (row) => row.id.trim() === mediaId && row.originRef?.trim() === key,
  );
}

function resolveStoreCoords(mediaContextId: string | null): {
  lat: number;
  lng: number;
} | null {
  const id = mediaContextId?.trim();
  if (!id) return null;
  const row = readMediaContextMemorySnapshot().find((r) => r.id.trim() === id);
  if (!row) return null;
  const lat = finiteCoord(row.lat);
  const lng = finiteCoord(row.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function nearestNodeAnchor(
  lat: number,
  lng: number,
  nodes: readonly ContextWorkspaceNode[],
): { lat: number; lng: number } | null {
  let best: { lat: number; lng: number; d: number } | null = null;
  for (const n of nodes) {
    if (!Number.isFinite(n.lat) || !Number.isFinite(n.lng)) continue;
    const d = haversineKm(
      { lat, lng },
      { lat: n.lat, lng: n.lng },
    );
    if (!best || d < best.d) {
      best = { lat: n.lat, lng: n.lng, d };
    }
  }
  return best ? { lat: best.lat, lng: best.lng } : null;
}

function fallbackCoords(input: {
  event: EventCandidate;
  nodes: readonly ContextWorkspaceNode[];
}): { lat: number; lng: number } | null {
  const withCoords = input.nodes.filter(
    (n) => Number.isFinite(n.lat) && Number.isFinite(n.lng),
  );
  if (withCoords.length > 0) {
    const lat =
      withCoords.reduce((sum, n) => sum + n.lat, 0) / withCoords.length;
    const lng =
      withCoords.reduce((sum, n) => sum + n.lng, 0) / withCoords.length;
    return { lat, lng };
  }
  const eventCoords = resolveEventGlobeCoords(input.event);
  if (Number.isFinite(eventCoords.lat) && Number.isFinite(eventCoords.lng)) {
    return { lat: eventCoords.lat, lng: eventCoords.lng };
  }
  return null;
}

function resolveMediaLatLng(input: {
  captureLat: number | null;
  captureLng: number | null;
  mediaContextId: string | null;
  event: EventCandidate;
  nodes: readonly ContextWorkspaceNode[];
}): { lat: number; lng: number } | null {
  if (input.captureLat != null && input.captureLng != null) {
    return { lat: input.captureLat, lng: input.captureLng };
  }
  const fromStore = resolveStoreCoords(input.mediaContextId);
  if (fromStore) return fromStore;

  const fb = fallbackCoords(input);
  if (!fb) return null;

  // Soft-snap orphan media to nearest itinerary stop when available.
  if (input.nodes.length > 0) {
    return nearestNodeAnchor(fb.lat, fb.lng, input.nodes) ?? fb;
  }
  return fb;
}

export function isWorkspaceContextMediaPinId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith(WORKSPACE_CONTEXT_MEDIA_PIN_PREFIX));
}

/**
 * Project context photo/video captures onto Workspace MapLibre pins.
 */
export function projectWorkspaceContextMediaPins(input: {
  readonly event: EventCandidate | null | undefined;
  readonly nodes?: readonly ContextWorkspaceNode[];
  readonly limit?: number;
  readonly viewerUserId?: string | null;
}): WorkspaceMapPin[] {
  const event = input.event;
  if (!event?.id?.trim()) return [];
  const eventId = event.id.trim();
  const nodes = input.nodes ?? [];
  const limit = input.limit ?? 24;
  const bridgeShared = isBridgeSharedEvent(event);
  const viewerUserId = input.viewerUserId?.trim() || null;
  const pins: WorkspaceMapPin[] = [];
  const seen = new Set<string>();

  const pushPin = (args: {
    id: string;
    title: string;
    kind: "photo" | "video";
    imageUrl: string | null;
    mediaContextId: string | null;
    allowLocalBlob: boolean;
    captureLat: number | null;
    captureLng: number | null;
    capturedAtIso: string | null;
  }) => {
    if (pins.length >= limit) return;
    const dedupe = args.mediaContextId || args.imageUrl || args.id;
    if (!dedupe || seen.has(dedupe)) return;
    const canShow =
      Boolean(args.imageUrl) ||
      args.allowLocalBlob ||
      Boolean(args.mediaContextId);
    if (!canShow) return;

    const coords = resolveMediaLatLng({
      captureLat: args.captureLat,
      captureLng: args.captureLng,
      mediaContextId: args.mediaContextId,
      event,
      nodes,
    });
    if (!coords) return;

    seen.add(dedupe);
    const media: WorkspaceContextMediaPayload = {
      kind: args.kind,
      imageUrl: args.imageUrl,
      mediaContextId: args.mediaContextId,
      allowLocalBlob: args.allowLocalBlob,
      recallCaption: buildGlobeContextMediaRecallCaption({
        event,
        volume: null,
        item: {
          capturedAtIso: args.capturedAtIso,
          authorDisplayName: null,
          ownerUserId: null,
          placeLabel: null,
        },
        viewerUserId,
      }),
      capturedAtIso: args.capturedAtIso,
    };

    pins.push({
      id: `${WORKSPACE_CONTEXT_MEDIA_PIN_PREFIX}${args.id}`,
      title: args.title,
      lat: coords.lat,
      lng: coords.lng,
      kind: "poi",
      photoSpot: true,
      contextMedia: media,
    });
  };

  for (const row of readFeedCaptureFragments(event)) {
    if (row.kind !== "photo" && row.kind !== "video") continue;
    const mediaContextId = row.mediaContextId?.trim() || null;
    const imageUrl = isUsableBridgeMediaUrl(row.url) ? row.url!.trim() : null;
    const allowLocalBlob = bridgeShared
      ? isLocalEventMedia(eventId, mediaContextId)
      : Boolean(mediaContextId);
    const pendingRemote = isBridgeCapturePendingRemote({
      bridgeShared,
      imageUrl,
      allowLocalBlob,
      capture: row,
      viewerUserId,
    });
    if (
      bridgeShared &&
      !shouldShowBridgeCaptureInReel({
        capture: row,
        imageUrl,
        allowLocalBlob,
        viewerUserId,
      }) &&
      !pendingRemote
    ) {
      continue;
    }
    if (!imageUrl && !allowLocalBlob && !pendingRemote) continue;

    pushPin({
      id: `capture:${row.id}`,
      title:
        row.label?.trim() ||
        row.placeLabel?.trim() ||
        (row.kind === "video" ? "동영상" : "사진"),
      kind: row.kind,
      imageUrl,
      mediaContextId,
      allowLocalBlob,
      captureLat: finiteCoord(row.lat),
      captureLng: finiteCoord(row.lng),
      capturedAtIso: row.capturedAtIso ?? null,
    });
  }

  const linked = new Set(
    pins
      .map((p) => p.contextMedia?.mediaContextId?.trim())
      .filter((id): id is string => Boolean(id)),
  );

  for (const row of readMediaContextMemorySnapshot()) {
    if (row.originRef?.trim() !== eventId) continue;
    const mediaId = row.id.trim();
    if (!mediaId || linked.has(mediaId)) continue;
    if (row.mediaKind !== "photo" && row.mediaKind !== "video") continue;
    pushPin({
      id: `store:${mediaId}`,
      title:
        row.placeLabel?.trim() ||
        (row.mediaKind === "video" ? "동영상" : "사진"),
      kind: row.mediaKind,
      imageUrl: null,
      mediaContextId: mediaId,
      allowLocalBlob: true,
      captureLat: finiteCoord(row.lat),
      captureLng: finiteCoord(row.lng),
      capturedAtIso: row.capturedAtIso ?? null,
    });
  }

  return pins;
}
