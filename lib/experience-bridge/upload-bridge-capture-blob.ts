"use client";

import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { readMediaBlob } from "@/lib/location-ping/media-blob-store";

function isRemoteShareUrl(url: string | undefined): boolean {
  const value = url?.trim();
  return Boolean(value?.startsWith("https://") && !value.startsWith("blob:"));
}

/** Upload local capture blob — returns https url or existing url. */
export async function uploadBridgeCaptureBlob(input: {
  eventId: string;
  capture: FeedCaptureFragment;
}): Promise<string | null> {
  if (isRemoteShareUrl(input.capture.url)) {
    return input.capture.url!.trim();
  }

  const mediaId = input.capture.mediaContextId?.trim();
  if (!mediaId) {
    return input.capture.url?.trim() || null;
  }

  const blob = await readMediaBlob(mediaId);
  if (!blob) {
    return input.capture.url?.trim() || null;
  }

  const ext = blob.type.includes("png")
    ? "png"
    : blob.type.includes("webp")
      ? "webp"
      : "jpg";
  const form = new FormData();
  form.append(
    "file",
    new File([blob], `${input.capture.id}.${ext}`, {
      type: blob.type || "image/jpeg",
    }),
  );
  form.append("eventId", input.eventId);
  form.append("captureId", input.capture.id);

  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/upload-media`;
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const body = (await response.json()) as { mediaUrl?: string; error?: string };
  if (!response.ok || !body.mediaUrl?.trim()) {
    return null;
  }
  return body.mediaUrl.trim();
}
