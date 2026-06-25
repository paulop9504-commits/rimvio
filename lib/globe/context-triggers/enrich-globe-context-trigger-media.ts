import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildRecallEventSnapshot,
  type RecallEventSnapshot,
} from "@/lib/recall/recall-event-snapshot";
import { normalizeMeaningPerson } from "@/lib/meaning/meaning-node-id";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import type {
  GlobeContextTrigger,
  GlobeContextTriggerMediaPreview,
} from "@/lib/globe/context-triggers/globe-context-trigger-types";

const MEDIA_CAP = 6;

function hasRenderableMedia(row: {
  imageUrl: string | null;
  allowLocalBlob?: boolean;
  mediaContextId: string | null;
}): boolean {
  if (row.imageUrl?.trim()) {
    return true;
  }
  return row.allowLocalBlob === true && Boolean(row.mediaContextId?.trim());
}

function reelToPreviews(
  event: EventCandidate,
  limit = MEDIA_CAP,
): GlobeContextTriggerMediaPreview[] {
  const reel = projectContextMediaReel({
    event,
    volume: null,
    limit: 12,
  });
  const videos = reel.filter((row) => row.kind === "video" && hasRenderableMedia(row));
  const photos = reel.filter((row) => row.kind === "photo" && hasRenderableMedia(row));
  const ordered =
    videos.length > 0
      ? [...videos.slice(0, 1), ...photos.slice(0, Math.max(0, limit - 1))]
      : photos;
  const seen = new Set<string>();
  const out: GlobeContextTriggerMediaPreview[] = [];
  for (const row of ordered) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    out.push({
      id: row.id,
      imageUrl: row.imageUrl,
      mediaContextId: row.mediaContextId,
      allowLocalBlob: row.allowLocalBlob,
      kind: row.kind,
    });
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}

function personMatches(snapshot: RecallEventSnapshot, personKey: string): boolean {
  return snapshot.people.some(
    (person) => normalizeMeaningPerson(person) === personKey,
  );
}

function collectPersonMedia(
  events: readonly EventCandidate[],
  personKey: string,
  now: Date,
): GlobeContextTriggerMediaPreview[] {
  const snapshots = events
    .map((event) => ({ event, snapshot: buildRecallEventSnapshot(event, now) }))
    .filter(({ snapshot }) => personMatches(snapshot, personKey))
    .sort((a, b) => {
      const aMs = a.snapshot.atIso ? Date.parse(a.snapshot.atIso) : 0;
      const bMs = b.snapshot.atIso ? Date.parse(b.snapshot.atIso) : 0;
      return bMs - aMs;
    });

  const out: GlobeContextTriggerMediaPreview[] = [];
  const seen = new Set<string>();
  for (const { event } of snapshots) {
    for (const preview of reelToPreviews(event, MEDIA_CAP)) {
      if (seen.has(preview.id)) {
        continue;
      }
      seen.add(preview.id);
      out.push(preview);
      if (out.length >= MEDIA_CAP) {
        return out;
      }
    }
  }
  return out;
}

export function enrichGlobeContextTriggerMedia(input: {
  triggers: readonly GlobeContextTrigger[];
  events: readonly EventCandidate[];
  now?: Date;
}): GlobeContextTrigger[] {
  const now = input.now ?? new Date();
  const byId = new Map(input.events.map((event) => [event.id, event]));

  return input.triggers.map((trigger) => {
    if (trigger.kind === "trade_match") {
      return trigger;
    }

    let mediaPreviews: GlobeContextTriggerMediaPreview[] = [];
    if (trigger.kind === "person_recall" && trigger.personKey) {
      mediaPreviews = collectPersonMedia(input.events, trigger.personKey, now);
    } else if (trigger.eventId) {
      const event = byId.get(trigger.eventId);
      if (event) {
        mediaPreviews = reelToPreviews(event);
      }
    }

    if (mediaPreviews.length === 0) {
      return trigger;
    }
    return { ...trigger, mediaPreviews };
  });
}
