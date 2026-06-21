"use client";

import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";

export function isLocalEventMedia(
  eventId: string,
  mediaContextId: string | null | undefined,
): boolean {
  const key = eventId.trim();
  const mediaId = mediaContextId?.trim();
  if (!key || !mediaId) {
    return false;
  }
  return readMediaContextMemorySnapshot().some(
    (row) => row.id.trim() === mediaId && row.originRef?.trim() === key,
  );
}
