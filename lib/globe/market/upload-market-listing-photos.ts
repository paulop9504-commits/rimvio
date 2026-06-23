"use client";

import {
  assertBridgeCaptureSize,
  bridgeStorageSegment,
  extensionForBridgeMediaContentType,
  publicBridgeMediaUrl,
} from "@/lib/experience-bridge/bridge-media-path";
import { EXPERIENCE_BRIDGE_MEDIA_BUCKET } from "@/lib/experience-bridge/bridge-media-constants";
import { createClient } from "@/lib/supabase/client";
import { RIMVIO_SUPABASE_URL } from "@/lib/supabase/rimvio-supabase-public";

function marketListingObjectPath(input: {
  userId: string;
  eventId: string;
  index: number;
  contentType: string;
}): string {
  const ext = extensionForBridgeMediaContentType(input.contentType);
  const eventKey = bridgeStorageSegment(input.eventId);
  return `${input.userId}/market/${eventKey}/photo-${input.index}.${ext}`;
}

function resolveSupabasePublicUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || RIMVIO_SUPABASE_URL;
}

/** Listing photos → public bridge bucket so handshake chat can show them cross-user. */
export async function uploadMarketListingPhotos(input: {
  userId: string;
  eventId: string;
  photoFiles: readonly File[];
}): Promise<string[]> {
  const files = input.photoFiles.filter((file) => file.type.startsWith("image/"));
  if (files.length === 0 || !input.userId.trim() || !input.eventId.trim()) {
    return [];
  }

  const supabase = createClient();
  const urls: string[] = [];

  for (let index = 0; index < Math.min(files.length, 6); index += 1) {
    const file = files[index]!;
    const contentType = file.type.trim().toLowerCase() || "image/jpeg";
    try {
      assertBridgeCaptureSize({ byteLength: file.size, contentType });
    } catch {
      continue;
    }

    const objectPath = marketListingObjectPath({
      userId: input.userId.trim(),
      eventId: input.eventId.trim(),
      index,
      contentType,
    });

    const { error } = await supabase.storage
      .from(EXPERIENCE_BRIDGE_MEDIA_BUCKET)
      .upload(objectPath, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      continue;
    }

    urls.push(publicBridgeMediaUrl(resolveSupabasePublicUrl(), objectPath));
  }

  return urls;
}
