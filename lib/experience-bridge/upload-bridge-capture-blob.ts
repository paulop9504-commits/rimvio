"use client";

import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";
import { prepareShareVideoFile } from "@/lib/media/share-video-compress/prepare-share-video-file";
import { shouldCompressShareVideo } from "@/lib/media/share-video-compress/should-compress-share-video";
import { readMediaBlob } from "@/lib/location-ping/media-blob-store";

function resolveBridgeCaptureFileMeta(input: {
  blob: Blob;
  capture: FeedCaptureFragment;
}): { ext: string; contentType: string } {
  const type = input.blob.type.trim().toLowerCase();
  const isVideo =
    input.capture.kind === "video" || type.startsWith("video/");

  if (isVideo) {
    if (type.includes("quicktime")) {
      return { ext: "mov", contentType: type || "video/quicktime" };
    }
    if (type.includes("webm")) {
      return { ext: "webm", contentType: type || "video/webm" };
    }
    if (type.includes("3gpp2")) {
      return { ext: "3g2", contentType: type || "video/3gpp2" };
    }
    if (type.includes("3gpp")) {
      return { ext: "3gp", contentType: type || "video/3gpp" };
    }
    return { ext: "mp4", contentType: type || "video/mp4" };
  }

  if (type.includes("png")) {
    return { ext: "png", contentType: type || "image/png" };
  }
  if (type.includes("webp")) {
    return { ext: "webp", contentType: type || "image/webp" };
  }
  if (type.includes("heic")) {
    return { ext: "heic", contentType: type || "image/heic" };
  }
  if (type.includes("heif")) {
    return { ext: "heif", contentType: type || "image/heif" };
  }
  return { ext: "jpg", contentType: type || "image/jpeg" };
}

/** Upload local capture blob — returns https url or existing url. */
export async function uploadBridgeCaptureBlob(input: {
  eventId: string;
  capture: FeedCaptureFragment;
}): Promise<string | null> {
  if (isUsableBridgeMediaUrl(input.capture.url)) {
    return input.capture.url!.trim();
  }

  const mediaId = input.capture.mediaContextId?.trim();
  if (!mediaId) {
    return input.capture.url?.trim() || null;
  }

  let blob = await readMediaBlob(mediaId);
  if (!blob) {
    return input.capture.url?.trim() || null;
  }

  const isVideo =
    input.capture.kind === "video" || blob.type.trim().toLowerCase().startsWith("video/");
  if (isVideo) {
    const sourceFile = new File([blob], `${input.capture.id}.mp4`, {
      type: blob.type || "video/mp4",
    });
    if (shouldCompressShareVideo({ file: sourceFile, sizeBytes: blob.size })) {
      const compressed = await prepareShareVideoFile({ file: sourceFile });
      blob = compressed;
    }
  }

  const { ext, contentType } = resolveBridgeCaptureFileMeta({
    blob,
    capture: input.capture,
  });
  const form = new FormData();
  form.append(
    "file",
    new File([blob], `${input.capture.id}.${ext}`, {
      type: contentType,
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
    throw new Error(body.error?.trim() || "미디어 업로드에 실패했어요.");
  }
  return body.mediaUrl.trim();
}
