/**
 * Chunk EventCandidate + Capture into personal memory units (my globe only).
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readPinContextNote } from "@/lib/globe/pin-context-note";
import { buildRecallEventSnapshot } from "@/lib/recall/recall-event-snapshot";
import { embedMemoryText } from "@/lib/personal-memory/hashed-embedding";

export type PersonalMemoryChunk = {
  readonly chunkId: string;
  readonly eventId: string;
  readonly kind: "event" | "capture" | "note";
  readonly text: string;
  readonly embedding: readonly number[];
  readonly place: string | null;
  readonly atIso: string | null;
};

function buildEventChunkText(event: EventCandidate, now: Date): string {
  const snap = buildRecallEventSnapshot(event, now);
  return [
    snap.title,
    snap.headline,
    snap.place,
    snap.city,
    ...snap.people,
    ...snap.noteTokens,
    ...snap.marketTokens,
    snap.marketProductName,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Build searchable chunks for one life event (event + captures + note). */
export function chunkEventMemory(
  event: EventCandidate,
  now: Date = new Date(),
): PersonalMemoryChunk[] {
  const eventId = event.id.trim();
  if (!eventId) {
    return [];
  }

  const chunks: PersonalMemoryChunk[] = [];
  const eventText = buildEventChunkText(event, now);
  if (eventText.trim()) {
    chunks.push({
      chunkId: `${eventId}:event`,
      eventId,
      kind: "event",
      text: eventText,
      embedding: embedMemoryText(eventText),
      place: event.place?.trim() || null,
      atIso: event.datetime ?? null,
    });
  }

  const note = readPinContextNote(event)?.trim() ?? "";
  if (note) {
    chunks.push({
      chunkId: `${eventId}:note`,
      eventId,
      kind: "note",
      text: note,
      embedding: embedMemoryText(note),
      place: event.place?.trim() || null,
      atIso: event.datetime ?? null,
    });
  }

  const captures = readFeedCaptureFragments(event);
  captures.forEach((fragment, index) => {
    const mediaText = (fragment.mediaTextSignals ?? [])
      .map((signal) => signal.text)
      .join(" ");
    const text = [
      fragment.label,
      fragment.placeLabel,
      fragment.kind,
      mediaText,
    ]
      .filter(Boolean)
      .join(" ");
    if (!text.trim()) {
      return;
    }
    chunks.push({
      chunkId: `${eventId}:capture:${fragment.id || index}`,
      eventId,
      kind: "capture",
      text,
      embedding: embedMemoryText(text),
      place: fragment.placeLabel?.trim() || event.place?.trim() || null,
      atIso: fragment.capturedAtIso ?? event.datetime ?? null,
    });
  });

  return chunks;
}

export function buildPersonalMemoryIndex(
  events: readonly EventCandidate[],
  now: Date = new Date(),
): PersonalMemoryChunk[] {
  return events.flatMap((event) => chunkEventMemory(event, now));
}
