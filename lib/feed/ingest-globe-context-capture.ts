"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import {
  commitCaptureToEvent,
  type SearchCaptureIngestResult,
} from "@/lib/feed/ingest-search-capture";
import {
  GLOBE_CONTEXT_MEDIA_ACCEPT,
  ingestGlobeContextMedia,
  ingestGlobeContextMediaBulk,
  type GlobeBulkMediaIngestSummary,
} from "@/lib/feed/ingest-globe-context-media";
import { resolveTargetEventFromSpacetime } from "@/lib/feed/resolve-target-event-from-spacetime";
import { extractPlaceHintFromText } from "@/lib/feed/extract-place-hint-from-text";
import { geocodeAndSyncGlobeContextPlace } from "@/lib/globe/geocode-and-sync-globe-context-place";
import { stampComposerTargetEvent } from "@/lib/globe/commit-pin-from-composer";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import {
  detectAccommodationIntent,
  stampAccommodationServiceTypeOnEvent,
} from "@/lib/event-kernel";

export type GlobeContextCaptureResult = {
  result: SearchCaptureIngestResult;
  toastLine: string;
  separated: boolean;
  placeVerify?: {
    needsPlaceVerify: boolean;
    askGpsOff: boolean;
  };
};

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/iu);
  return match?.[0] ?? null;
}

function buildTextToast(input: {
  result: SearchCaptureIngestResult;
  separated: boolean;
}): string {
  const kind =
    input.result.fragment.kind === "link"
      ? "링크"
      : input.result.fragment.kind === "photo"
        ? "사진"
        : "메모";
  if (input.separated) {
    return `맥락과 따로 · ${input.result.event.title}에 ${kind} 넣었어요`;
  }
  if (input.result.createdNewEvent) {
    return `새 맥락 · ${input.result.event.title}에 ${kind} 붙였어요`;
  }
  return `${input.result.event.title}에 ${kind} 붙였어요`;
}

function commitTextCapture(input: {
  text: string;
  capturedAtIso: string;
}): GlobeContextCaptureResult {
  const trimmed = input.text.trim();
  const url = extractFirstUrl(trimmed);
  const placeHint = extractPlaceHintFromText(trimmed);

  const { event: resolvedEvent, match, createdNewEvent } = resolveTargetEventFromSpacetime({
    capturedAtIso: input.capturedAtIso,
    lat: null,
    lng: null,
    placeLabel: placeHint,
    memoText: trimmed,
  });

  const event = stampComposerTargetEvent(resolvedEvent, trimmed, createdNewEvent);

  const fragment: FeedCaptureFragment = {
    id: `globe-memo:${Date.now()}`,
    kind: url ? "link" : "memo",
    capturedAtIso: input.capturedAtIso,
    label: trimmed.slice(0, 120),
    url: url ?? undefined,
    placeLabel: match?.placeLabel ?? event.place ?? placeHint ?? undefined,
  };

  const separated =
    !createdNewEvent &&
    Boolean(match) &&
    match!.confidence === "low";

  const result = commitCaptureToEvent({
    target: event,
    match,
    createdNewEvent,
    fragment,
    userConfirmedTarget: !separated && Boolean(match) && match!.confidence !== "low",
  });

  if (detectAccommodationIntent(trimmed)) {
    stampAccommodationServiceTypeOnEvent(result.event.id);
  }

  return {
    result,
    separated,
    toastLine: buildTextToast({ result, separated }),
  };
}

async function geocodeTextCapturePlace(
  result: SearchCaptureIngestResult,
  rawText: string,
): Promise<GlobeContextCaptureResult["placeVerify"]> {
  const place =
    result.event.place?.trim() ||
    extractPlaceHintFromText(rawText)?.trim() ||
    null;
  if (!place) {
    return undefined;
  }
  const geocoded = await geocodeAndSyncGlobeContextPlace({
    eventId: result.event.id,
    placeLabel: place,
    title: result.event.title,
    force: result.createdNewEvent,
  });
  if (!geocoded.needsPlaceVerify) {
    return undefined;
  }
  return {
    needsPlaceVerify: true,
    askGpsOff: geocoded.askGpsOff,
  };
}

/** Text / link / memo — auto-route to best globe context. */
export async function ingestGlobeContextFromText(
  text: string,
): Promise<GlobeContextCaptureResult> {
  const captured = commitTextCapture({
    text,
    capturedAtIso: new Date().toISOString(),
  });
  const placeVerify = await geocodeTextCapturePlace(captured.result, text);
  syncPersonalGlobePinFromEvent(captured.result.event.id);
  return { ...captured, placeVerify };
}

/** Photo — spacetime match or split to new moment. */
export async function ingestGlobeContextFromFile(
  file: File,
): Promise<GlobeContextCaptureResult> {
  const outcome = await ingestGlobeContextMedia({ file });
  return {
    result: outcome.result,
    separated: outcome.separated,
    toastLine: outcome.toastLine,
  };
}

export { GLOBE_CONTEXT_MEDIA_ACCEPT };

/** Photos/videos — spacetime match or split per file. */
export async function ingestGlobeContextFromFiles(
  files: File[],
  input?: {
    hintEventId?: string | null;
    hintTitle?: string | null;
    forceAttachToHint?: boolean;
    onProgress?: (done: number, total: number) => void;
    onFilePrepare?: (message: string) => void;
  },
): Promise<GlobeBulkMediaIngestSummary> {
  const summary = await ingestGlobeContextMediaBulk({
    files,
    hintEventId: input?.hintEventId,
    hintTitle: input?.hintTitle,
    forceAttachToHint: input?.forceAttachToHint,
    onProgress: input?.onProgress,
    onFilePrepare: input?.onFilePrepare,
  });
  return {
    total: summary.total,
    succeeded: summary.succeeded,
    failed: summary.failed,
    attached: summary.attached,
    separated: summary.separated,
    lastEventId: summary.lastEventId,
    toastLine: summary.toastLine,
    lastSuggestedPlaceName: summary.lastSuggestedPlaceName,
    pinsCreated: summary.pinsCreated,
    exifPinned: summary.exifPinned,
    poolStaged: summary.poolStaged,
    lastError: summary.lastError,
    outcomes: summary.outcomes,
  };
}

export function globeContextEventId(result: SearchCaptureIngestResult): string {
  return result.event.id;
}

export function globeContextEventTitle(event: EventCandidate): string {
  return event.title.trim() || "맥락";
}
