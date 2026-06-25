"use client";

import {
  bridgeStorageSegment,
  extensionForBridgeMediaContentType,
  publicBridgeMediaUrl,
} from "@/lib/experience-bridge/bridge-media-path";
import { EXPERIENCE_BRIDGE_MEDIA_BUCKET } from "@/lib/experience-bridge/bridge-media-constants";
import {
  assertMarketListingMediaSize,
  isMarketListingPhotoFile,
  isMarketListingVideoFile,
  MARKET_LISTING_VIDEO_MAX_BYTES,
  MARKET_LISTING_VIDEO_MAX_DURATION_SEC,
} from "@/lib/globe/market/market-listing-media";
import { prepareShareVideoFile } from "@/lib/media/share-video-compress/prepare-share-video-file";
import { createClient } from "@/lib/supabase/client";
import { RIMVIO_SUPABASE_URL } from "@/lib/supabase/rimvio-supabase-public";

function marketListingObjectPath(input: {
  userId: string;
  eventId: string;
  index: number;
  contentType: string;
  kind: "photo" | "video";
}): string {
  const ext = extensionForBridgeMediaContentType(input.contentType);
  const eventKey = bridgeStorageSegment(input.eventId);
  const label = input.kind === "video" ? "video" : "photo";
  return `${input.userId}/market/${eventKey}/${label}-${input.index}.${ext}`;
}

function resolveSupabasePublicUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || RIMVIO_SUPABASE_URL;
}

async function uploadMarketListingFile(input: {
  userId: string;
  eventId: string;
  file: File;
  index: number;
  kind: "photo" | "video";
}): Promise<string | null> {
  const contentType = input.file.type.trim().toLowerCase() || (input.kind === "video" ? "video/mp4" : "image/jpeg");
  try {
    assertMarketListingMediaSize({ byteLength: input.file.size, contentType });
  } catch {
    return null;
  }

  const objectPath = marketListingObjectPath({
    userId: input.userId.trim(),
    eventId: input.eventId.trim(),
    index: input.index,
    contentType,
    kind: input.kind,
  });

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(EXPERIENCE_BRIDGE_MEDIA_BUCKET)
    .upload(objectPath, input.file, {
      contentType,
      upsert: true,
    });

  if (error) {
    return null;
  }

  return publicBridgeMediaUrl(resolveSupabasePublicUrl(), objectPath);
}

/** Listing photos → public bridge bucket so handshake chat can show them cross-user. */
export async function uploadMarketListingPhotos(input: {
  userId: string;
  eventId: string;
  photoFiles: readonly File[];
}): Promise<string[]> {
  const files = input.photoFiles.filter(isMarketListingPhotoFile);
  if (files.length === 0 || !input.userId.trim() || !input.eventId.trim()) {
    return [];
  }

  const urls: string[] = [];

  for (let index = 0; index < Math.min(files.length, 6); index += 1) {
    const file = files[index]!;
    const url = await uploadMarketListingFile({
      userId: input.userId,
      eventId: input.eventId,
      file,
      index,
      kind: "photo",
    });
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}

/** Listing video clip → same public bucket for opportunity field buyers. */
export async function uploadMarketListingVideos(input: {
  userId: string;
  eventId: string;
  videoFiles: readonly File[];
}): Promise<string[]> {
  const files = input.videoFiles.filter(isMarketListingVideoFile);
  if (files.length === 0 || !input.userId.trim() || !input.eventId.trim()) {
    return [];
  }

  const urls: string[] = [];

  for (let index = 0; index < Math.min(files.length, 1); index += 1) {
    const raw = files[index]!;
    let file = raw;
    try {
      file = await prepareShareVideoFile({
        file: raw,
        maxDurationSec: MARKET_LISTING_VIDEO_MAX_DURATION_SEC,
        maxBytes: MARKET_LISTING_VIDEO_MAX_BYTES,
      });
    } catch {
      file = raw;
    }

    const url = await uploadMarketListingFile({
      userId: input.userId,
      eventId: input.eventId,
      file,
      index,
      kind: "video",
    });
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}
