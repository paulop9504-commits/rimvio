"use client";

import { findEventCandidate, listEventCandidates } from "@/lib/events/event-store";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedCaptureFragment, SpacetimeFeedTargetMatch } from "@/lib/feed/feed-capture-types";
import {
  commitCaptureToEvent,
  type SearchCaptureIngestResult,
} from "@/lib/feed/ingest-search-capture";
import { resolveTargetEventFromSpacetime } from "@/lib/feed/resolve-target-event-from-spacetime";
import { CONTEXT_MATCH_MIN_SCORE } from "@/lib/ingest/context-match-media-gate";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { enrichGlobePhotoPlaceAfterIngest } from "@/lib/globe/enrich-globe-photo-place-after-ingest";
import { publishBridgeCaptureContribution } from "@/lib/experience-bridge/publish-bridge-capture-contribution";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import { attachMediaSpacetime } from "@/lib/location-ping/attach-media-spacetime";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export const GLOBE_BULK_PHOTO_MAX = 100;
export const GLOBE_CONTEXT_MEDIA_ACCEPT = "image/*,video/*";

const VIDEO_EXT =
  /\.(mp4|mov|m4v|webm|mkv|avi|3gp|3g2|qt|mpeg|mpg)$/iu;

export function isGlobeContextIngestMediaFile(file: File): boolean {
  const type = file.type.trim().toLowerCase();
  if (type.startsWith("image/") || type.startsWith("video/")) {
    return true;
  }
  if (!type) {
    const name = file.name.trim().toLowerCase();
    return (
      /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/iu.test(name) ||
      VIDEO_EXT.test(name)
    );
  }
  return false;
}

function mediaNoun(kind: FeedCaptureFragment["kind"]): string {
  return kind === "video" ? "동영상" : "사진";
}

export type GlobeContextMediaIngestResult = {
  result: SearchCaptureIngestResult;
  attachedToHintedEvent: boolean;
  separated: boolean;
  toastLine: string;
  suggestedPlaceName: string | null;
};

export type GlobeBulkMediaIngestSummary = {
  total: number;
  succeeded: number;
  failed: number;
  attached: number;
  separated: number;
  lastEventId: string | null;
  toastLine: string;
  lastSuggestedPlaceName: string | null;
};

function captureKindFromContext(context: MediaSpacetimeContext): FeedCaptureFragment["kind"] {
  if (context.mediaKind === "video") {
    return "video";
  }
  return "photo";
}

function buildMatch(
  event: EventCandidate,
  score: number,
  placeLabel: string | null,
): SpacetimeFeedTargetMatch {
  return {
    eventId: event.id,
    eventTitle: event.title,
    confidence: score >= 0.82 ? "high" : score >= CONTEXT_MATCH_MIN_SCORE ? "medium" : "low",
    score,
    placeLabel,
    dayLabel: null,
    reason: event.title,
  };
}

function resolveHintedEvent(hintId: string): EventCandidate | null {
  const trimmed = hintId.trim();
  if (!trimmed) {
    return null;
  }
  return (
    findEventCandidate(trimmed) ?? recoverGlobeContextEventFromPin(trimmed)
  );
}

function resolveGlobePhotoTarget(input: {
  context: MediaSpacetimeContext;
  hintEventId?: string | null;
  forceAttachToHint?: boolean;
}): {
  event: EventCandidate;
  match: SpacetimeFeedTargetMatch | null;
  createdNewEvent: boolean;
  attachedToHintedEvent: boolean;
  separated: boolean;
} {
  const events = listEventCandidates();
  const hintId = input.hintEventId?.trim();

  if (hintId && input.forceAttachToHint) {
    const hinted = resolveHintedEvent(hintId);
    if (hinted) {
      const plan = readPlanContextFromEvent(hinted);
      const fit = scoreSpacetimeFit({
        capturedAtIso: input.context.capturedAtIso,
        lat: input.context.lat,
        lng: input.context.lng,
        eventStartIso: hinted.datetime!,
        eventEndIso: plan?.windowEndIso ?? null,
        eventPlace: plan?.place ?? hinted.place,
        capturedPlaceLabel: input.context.placeLabel,
      });
      return {
        event: hinted,
        match: buildMatch(
          hinted,
          Math.max(fit.score, CONTEXT_MATCH_MIN_SCORE),
          plan?.place ?? hinted.place ?? input.context.placeLabel,
        ),
        createdNewEvent: false,
        attachedToHintedEvent: true,
        separated: false,
      };
    }
  }

  if (hintId) {
    const hinted = resolveHintedEvent(hintId);
    if (hinted) {
      const plan = readPlanContextFromEvent(hinted);
      const fit = scoreSpacetimeFit({
        capturedAtIso: input.context.capturedAtIso,
        lat: input.context.lat,
        lng: input.context.lng,
        eventStartIso: hinted.datetime!,
        eventEndIso: plan?.windowEndIso ?? null,
        eventPlace: plan?.place ?? hinted.place,
        capturedPlaceLabel: input.context.placeLabel,
      });

      if (fit.score >= CONTEXT_MATCH_MIN_SCORE || fit.fits) {
        return {
          event: hinted,
          match: buildMatch(
            hinted,
            Math.max(fit.score, CONTEXT_MATCH_MIN_SCORE),
            plan?.place ?? hinted.place ?? input.context.placeLabel,
          ),
          createdNewEvent: false,
          attachedToHintedEvent: true,
          separated: false,
        };
      }

      const resolved = resolveTargetEventFromSpacetime({
        capturedAtIso: input.context.capturedAtIso,
        lat: input.context.lat,
        lng: input.context.lng,
        placeLabel: input.context.placeLabel,
        events,
      });

      return {
        event: resolved.event,
        match: resolved.match,
        createdNewEvent: resolved.createdNewEvent,
        attachedToHintedEvent: false,
        separated: true,
      };
    }
  }

  const resolved = resolveTargetEventFromSpacetime({
    capturedAtIso: input.context.capturedAtIso,
    lat: input.context.lat,
    lng: input.context.lng,
    placeLabel: input.context.placeLabel,
    events,
  });

  return {
    event: resolved.event,
    match: resolved.match,
    createdNewEvent: resolved.createdNewEvent,
    attachedToHintedEvent: false,
    separated: resolved.createdNewEvent || resolved.event.id !== hintId,
  };
}

function buildGlobeToast(input: {
  result: SearchCaptureIngestResult;
  attachedToHintedEvent: boolean;
  separated: boolean;
  hintTitle?: string | null;
}): string {
  if (input.attachedToHintedEvent) {
    return `${input.result.event.title} 맥락에 ${mediaNoun(input.result.fragment.kind)} 붙였어요`;
  }
  if (input.separated) {
    const hint = input.hintTitle?.trim();
    if (hint) {
      return `${hint}와는 따로 · ${input.result.event.title}에 넣었어요`;
    }
    return input.result.toastLine;
  }
  return input.result.toastLine;
}

/** Globe / pin-open photo — attach when spacetime fits, else split to new moment. */
export async function ingestGlobeContextMedia(input: {
  file: File;
  hintEventId?: string | null;
  hintTitle?: string | null;
  /** Pin card upload — always attach to hinted context (user intent). */
  forceAttachToHint?: boolean;
  onFilePrepare?: (message: string) => void;
}): Promise<GlobeContextMediaIngestResult> {
  const context = await attachMediaSpacetime({
    file: input.file,
    origin: "feed_capture",
    originRef: input.hintEventId?.trim() || "globe",
    onFilePrepare: input.onFilePrepare,
  });

  const target = resolveGlobePhotoTarget({
    context,
    hintEventId: input.hintEventId,
    forceAttachToHint: input.forceAttachToHint === true,
  });

  const fragment: FeedCaptureFragment = {
    id: context.id,
    kind: captureKindFromContext(context),
    capturedAtIso: context.capturedAtIso,
    mediaContextId: context.id,
    placeLabel: context.placeLabel ?? undefined,
  };

  const result = commitCaptureToEvent({
    target: target.event,
    match: target.match,
    createdNewEvent: target.createdNewEvent,
    fragment,
    userConfirmedTarget: target.attachedToHintedEvent,
  });

  syncPersonalGlobePinFromEvent(result.event.id);
  if (input.hintEventId?.trim() && input.hintEventId !== result.event.id) {
    syncPersonalGlobePinFromEvent(input.hintEventId);
  }

  void publishBridgeCaptureContribution({
    eventId: result.event.id,
    fragment: result.fragment,
  }).catch((caught) => {
    if (typeof window !== "undefined") {
      const message =
        caught instanceof Error ? caught.message : "공유 미디어를 올리지 못했어요.";
      void import("sonner").then(({ toast }) => toast.error(message));
    }
  });

  let suggestedPlaceName: string | null = null;
  try {
    suggestedPlaceName = await enrichGlobePhotoPlaceAfterIngest({
      file: input.file,
      context,
      eventId: result.event.id,
    });
  } catch {
    // Non-blocking — photo ingest should still succeed.
  }

  return {
    result,
    attachedToHintedEvent: target.attachedToHintedEvent,
    separated: target.separated,
    toastLine: buildGlobeToast({
      result,
      attachedToHintedEvent: target.attachedToHintedEvent,
      separated: target.separated,
      hintTitle: input.hintTitle,
    }),
    suggestedPlaceName,
  };
}

function buildBulkToast(input: {
  total: number;
  succeeded: number;
  failed: number;
  attached: number;
  separated: number;
}): string {
  if (input.succeeded === 0) {
    return input.failed > 0
      ? "사진·동영상을 넣지 못했어요"
      : "올릴 사진·동영상이 없어요";
  }
  if (input.total === 1) {
    return input.failed > 0
      ? "1개를 넣지 못했어요"
      : "사진·동영상 1개 붙였어요";
  }
  const parts: string[] = [`사진·동영상 ${input.succeeded}개 붙였어요`];
  if (input.attached > 0 && input.separated > 0) {
    parts.push(`${input.attached}개 맥락 · ${input.separated}개 따로`);
  } else if (input.separated > 0) {
    parts.push(`${input.separated}개는 맥락과 따로`);
  }
  if (input.failed > 0) {
    parts.push(`${input.failed}개 실패`);
  }
  return parts.join(" · ");
}

/** Up to 100 photos/videos — sequential ingest with attach/split per spacetime. */
export async function ingestGlobeContextMediaBulk(input: {
  files: File[];
  hintEventId?: string | null;
  hintTitle?: string | null;
  forceAttachToHint?: boolean;
  onProgress?: (done: number, total: number) => void;
  onFilePrepare?: (message: string) => void;
}): Promise<
  GlobeBulkMediaIngestSummary & { outcomes: GlobeContextMediaIngestResult[] }
> {
  const mediaFiles = input.files
    .filter(isGlobeContextIngestMediaFile)
    .slice(0, GLOBE_BULK_PHOTO_MAX);
  const total = mediaFiles.length;
  const outcomes: GlobeContextMediaIngestResult[] = [];
  let failed = 0;
  let attached = 0;
  let separated = 0;
  let lastEventId: string | null = null;

  for (let index = 0; index < mediaFiles.length; index += 1) {
    try {
      const outcome = await ingestGlobeContextMedia({
        file: mediaFiles[index]!,
        hintEventId: input.hintEventId,
        hintTitle: input.hintTitle,
        forceAttachToHint: input.forceAttachToHint,
        onFilePrepare: input.onFilePrepare,
      });
      outcomes.push(outcome);
      lastEventId = outcome.result.event.id;
      if (outcome.attachedToHintedEvent) {
        attached += 1;
      } else if (outcome.separated) {
        separated += 1;
      }
    } catch {
      failed += 1;
    }
    input.onProgress?.(index + 1, total);
  }

  const succeeded = outcomes.length;
  const lastSuggestedPlaceName =
    [...outcomes]
      .reverse()
      .find((row) => row.suggestedPlaceName?.trim())
      ?.suggestedPlaceName?.trim() ?? null;
  return {
    total,
    succeeded,
    failed,
    attached,
    separated,
    lastEventId,
    toastLine: buildBulkToast({ total, succeeded, failed, attached, separated }),
    lastSuggestedPlaceName,
    outcomes,
  };
}
