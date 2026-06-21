import { bridgeMediaObjectPath } from "@/lib/experience-bridge/bridge-media-path";
import type { BridgeContributionCapture } from "@/lib/experience-bridge/bridge-capture-spacetime";
import { mergeBridgeCaptureSpacetime } from "@/lib/experience-bridge/normalize-bridge-contribution-capture";
import { encodeGeohash } from "@/lib/materialize/encode-geohash";
import { findCaptureByMediaContextId } from "@/lib/materialize/materialize-db";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { findMediaSpacetimeContextById } from "@/lib/location-ping/media-context-store";

function resolveBridgeCaptureFileMeta(blob: Blob, capture: FeedCaptureFragment): string {
  const type = blob.type.trim().toLowerCase();
  if (capture.kind === "video" || type.startsWith("video/")) {
    if (type.includes("quicktime")) return "video/quicktime";
    if (type.includes("webm")) return "video/webm";
    return type || "video/mp4";
  }
  if (type.includes("png")) return "image/png";
  if (type.includes("webp")) return "image/webp";
  if (type.includes("heic")) return "image/heic";
  return type || "image/jpeg";
}

/** Enrich publish payload from device index + media context + storage upload. */
export async function buildBridgeContributionCapture(input: {
  fragment: FeedCaptureFragment;
  eventId: string;
  userId: string;
  mediaUrl: string;
  storagePath: string;
  byteSize: number;
  blob?: Blob | null;
}): Promise<BridgeContributionCapture> {
  const mediaContextId = input.fragment.mediaContextId?.trim() ?? "";
  let fileHash: string | null = null;
  let geohash: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  if (mediaContextId) {
    const indexed = await findCaptureByMediaContextId(mediaContextId);
    if (indexed) {
      fileHash = indexed.fileHash;
      geohash = indexed.geohash;
      lat = indexed.lat;
      lng = indexed.lng;
    } else {
      const context = await findMediaSpacetimeContextById(mediaContextId);
      if (context?.lat != null && context.lng != null) {
        lat = context.lat;
        lng = context.lng;
        geohash = encodeGeohash(context.lat, context.lng) || null;
      }
    }
  }

  return mergeBridgeCaptureSpacetime(input.fragment, {
    url: input.mediaUrl,
    storagePath: input.storagePath,
    byteSize: input.byteSize,
    fileHash,
    takenAtIso: input.fragment.capturedAtIso,
    geohash,
    lat,
    lng,
  });
}

export function buildBridgeStoragePath(input: {
  userId: string;
  eventId: string;
  capture: FeedCaptureFragment;
  blob: Blob;
}): string {
  const contentType = resolveBridgeCaptureFileMeta(input.blob, input.capture);
  return bridgeMediaObjectPath({
    userId: input.userId,
    eventId: input.eventId,
    captureId: input.capture.id,
    contentType,
  });
}
