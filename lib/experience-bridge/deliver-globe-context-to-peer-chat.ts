"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readGlobeContextCardCoords } from "@/lib/globe/globe-context-card-coords";
import { sendSharedGlobePinRemote } from "@/lib/peer-chat/peer-chat-client";

export type GlobeContextShareDelivery = {
  title: string;
  date: string | null;
  place: string;
};

function buildDeliveryNote(delivery: GlobeContextShareDelivery): string {
  const title = delivery.title.trim();
  const place = delivery.place.trim();
  const date = delivery.date?.trim() ?? "";
  const parts = [title, place, date].filter(Boolean);
  return parts.join(" · ");
}

async function resolveFirstShareablePhotoFile(
  event: EventCandidate,
): Promise<File | undefined> {
  const photo = readFeedCaptureFragments(event).find(
    (row) => row.kind === "photo" && row.url?.trim(),
  );
  const url = photo?.url?.trim();
  if (!url || (!url.startsWith("blob:") && !url.startsWith("http"))) {
    return undefined;
  }
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    if (!blob.size) {
      return undefined;
    }
    return new File([blob], "moment.jpg", {
      type: blob.type || "image/jpeg",
    });
  } catch {
    return undefined;
  }
}

/** DM thread — map card + optional hero photo (1-tap share companion). */
export async function deliverGlobeContextToPeerChat(input: {
  event: EventCandidate;
  peerThreadId: string;
  hostDisplayName: string;
  delivery: GlobeContextShareDelivery;
}): Promise<void> {
  const threadId = input.peerThreadId.trim();
  if (!threadId) {
    return;
  }

  const coords = readGlobeContextCardCoords(input.event);
  const note = buildDeliveryNote(input.delivery);
  const file = await resolveFirstShareablePhotoFile(input.event);
  const capturedAtIso = input.event.datetime?.trim() || undefined;

  await sendSharedGlobePinRemote({
    threadId,
    displayName: input.hostDisplayName,
    lat: coords.lat,
    lng: coords.lng,
    placeLabel: coords.placeLabel,
    note: note || undefined,
    capturedAtIso,
    file,
  });
}
