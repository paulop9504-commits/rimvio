"use client";

import type { GlobeContextMediaIngestResult } from "@/lib/feed/ingest-globe-context-media";
import { readFeedCaptureFragments, removeFeedCaptureFragment } from "@/lib/feed/feed-capture-metadata";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { deleteGlobeContext } from "@/lib/globe/delete-globe-context";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model";

export const GLOBE_PHOTO_INGEST_UNDO_MS = 30_000;
const STORAGE_KEY = "rimvio.globe-photo-ingest-undo.v1";

export type GlobePhotoIngestUndoEntry = {
  eventId: string;
  captureId: string;
  createdNewEvent: boolean;
};

export type GlobePhotoIngestUndoPayload = {
  entries: GlobePhotoIngestUndoEntry[];
  headline: string;
  committedAtIso: string;
};

export function buildPhotoIngestUndoPayload(
  outcomes: readonly GlobeContextMediaIngestResult[],
): GlobePhotoIngestUndoPayload | null {
  const entries: GlobePhotoIngestUndoEntry[] = [];
  for (const row of outcomes) {
    if (row.stagedToPool) {
      continue;
    }
    const eventId = row.result.event.id.trim();
    const captureId = row.result.fragment.id.trim();
    if (!eventId || !captureId) {
      continue;
    }
    entries.push({
      eventId,
      captureId,
      createdNewEvent: row.result.createdNewEvent,
    });
  }
  if (entries.length === 0) {
    return null;
  }
  const primary = findLifeEventCandidate(entries[0]!.eventId);
  const headline =
    primary?.title?.trim() ||
    primary?.place?.trim() ||
    (entries.length === 1 ? "방금 남긴 흔적" : `사진·동영상 ${entries.length}개`);
  return {
    entries,
    headline,
    committedAtIso: new Date().toISOString(),
  };
}

export function stashPhotoIngestUndo(payload: GlobePhotoIngestUndoPayload): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Non-blocking.
  }
}

export function readStashedPhotoIngestUndo(): GlobePhotoIngestUndoPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as GlobePhotoIngestUndoPayload;
    if (!parsed?.entries?.length || !parsed.committedAtIso) {
      return null;
    }
    const age = Date.now() - Date.parse(parsed.committedAtIso);
    if (!Number.isFinite(age) || age > GLOBE_PHOTO_INGEST_UNDO_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearStashedPhotoIngestUndo(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function notifyLifeEventsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_CANDIDATES_UPDATED));
  }
}

/** Roll back a just-committed photo/video batch (reflog window). */
export function undoGlobePhotoIngest(payload: GlobePhotoIngestUndoPayload): boolean {
  const touchedEvents = new Set<string>();
  const createdEvents = new Set<string>();

  for (const entry of payload.entries) {
    touchedEvents.add(entry.eventId);
    if (entry.createdNewEvent) {
      createdEvents.add(entry.eventId);
    }
    const event = findLifeEventCandidate(entry.eventId);
    if (!event) {
      continue;
    }
    const nextMetadata = removeFeedCaptureFragment(event.metadata, entry.captureId);
    commitEventUpsert({
      id: event.id,
      title: event.title,
      category: event.category,
      source: event.source,
      lifecycle: event.lifecycle,
      datetime: event.datetime,
      place: event.place,
      confidence: event.confidence,
      metadata: nextMetadata,
    });
  }

  for (const eventId of touchedEvents) {
    const event = findLifeEventCandidate(eventId);
    if (!event) {
      continue;
    }
    const remaining = readFeedCaptureFragments(event).filter(
      (row) => row.kind === "photo" || row.kind === "video",
    );
    if (createdEvents.has(eventId) && remaining.length === 0) {
      deleteGlobeContext(eventId);
    } else {
      syncPersonalGlobePinFromEvent(eventId);
    }
  }

  clearStashedPhotoIngestUndo();
  notifyLifeEventsUpdated();
  return true;
}
