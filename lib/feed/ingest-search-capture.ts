"use client";

import { attachMediaSpacetime } from "@/lib/location-ping/attach-media-spacetime";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import { listEventCandidates } from "@/lib/events/event-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  FeedCaptureFragment,
  FeedCaptureKind,
  SpacetimeFeedTargetMatch,
} from "@/lib/feed/feed-capture-types";
import {
  appendFeedCaptureFragment,
  removeFeedCaptureFragment,
} from "@/lib/feed/feed-capture-metadata";
import { buildMomentEventDraft } from "@/lib/feed/bootstrap-spacetime-target";
import { resolveSpacetimeFeedTarget } from "@/lib/feed/resolve-spacetime-feed-target";

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/iu);
  return match?.[0] ?? null;
}

function captureKindFromMedia(
  context: MediaSpacetimeContext | null,
  fallback: FeedCaptureKind,
): FeedCaptureKind {
  if (!context) {
    return fallback;
  }
  if (context.mediaKind === "video") {
    return "video";
  }
  if (context.mediaKind === "photo") {
    return "photo";
  }
  return fallback;
}

export type SearchCaptureIngestResult = {
  event: EventCandidate;
  match: SpacetimeFeedTargetMatch | null;
  createdNewEvent: boolean;
  fragment: FeedCaptureFragment;
  toastLine: string;
  needsTargetingConfirm: boolean;
};

function buildToastLine(input: {
  match: SpacetimeFeedTargetMatch | null;
  createdNewEvent: boolean;
  kind: FeedCaptureKind;
  eventTitle: string;
}): string {
  const kindLabel =
    input.kind === "photo"
      ? "사진"
      : input.kind === "video"
        ? "영상"
        : input.kind === "link"
          ? "링크"
          : "메모";

  if (input.createdNewEvent) {
    return `${input.eventTitle}에 ${kindLabel} 붙였어요`;
  }
  if (input.match?.dayLabel) {
    return `${input.match.eventTitle} · ${input.match.dayLabel}에 ${kindLabel} 붙였어요`;
  }
  if (input.match) {
    return `${input.match.eventTitle}에 ${kindLabel} 붙였어요`;
  }
  return `Feed에 ${kindLabel} 붙였어요`;
}

function commitCaptureToEvent(input: {
  target: EventCandidate;
  match: SpacetimeFeedTargetMatch | null;
  createdNewEvent: boolean;
  fragment: FeedCaptureFragment;
  userConfirmedTarget?: boolean;
}): SearchCaptureIngestResult {
  const fragment: FeedCaptureFragment = {
    ...input.fragment,
    autoAttached: !input.userConfirmedTarget,
    verified: input.userConfirmedTarget === true,
  };

  let metadata = appendFeedCaptureFragment(input.target.metadata, fragment);
  if (!input.userConfirmedTarget) {
    metadata = {
      ...metadata,
      feedCapturePendingVerify: true,
    };
  } else {
    metadata = {
      ...metadata,
      feedCapturePendingVerify: false,
      feedCaptureVerifiedAt: new Date().toISOString(),
    };
  }

  const saved = commitEventUpsert({
    id: input.target.id,
    title: input.target.title,
    category: input.target.category,
    source: input.target.source,
    lifecycle: input.target.lifecycle,
    datetime: input.target.datetime,
    place: input.target.place,
    containerId: input.target.containerId,
    confidence: input.target.confidence,
    metadata,
    lifecycleUpdatedAt: input.target.lifecycleUpdatedAt,
  });

  const needsTargetingConfirm =
    !input.userConfirmedTarget &&
    (input.createdNewEvent ||
      (input.match !== null && input.match.confidence === "low"));

  return {
    event: saved,
    match: input.match,
    createdNewEvent: input.createdNewEvent,
    fragment: input.fragment,
    needsTargetingConfirm,
    toastLine: buildToastLine({
      match: input.match,
      createdNewEvent: input.createdNewEvent,
      kind: input.fragment.kind,
      eventTitle: saved.title,
    }),
  };
}

function resolveTargetEvent(input: {
  capturedAtIso: string;
  lat: number | null;
  lng: number | null;
  placeLabel: string | null;
  memoText?: string | null;
}): {
  event: EventCandidate;
  match: SpacetimeFeedTargetMatch | null;
  createdNewEvent: boolean;
} {
  const events = listEventCandidates();
  const match = resolveSpacetimeFeedTarget({
    capturedAtIso: input.capturedAtIso,
    lat: input.lat,
    lng: input.lng,
    placeLabel: input.placeLabel,
    memoText: input.memoText,
    events,
  });

  if (match) {
    const existing = events.find((event) => event.id === match.eventId);
    if (existing) {
      return { event: existing, match, createdNewEvent: false };
    }
  }

  const draft = buildMomentEventDraft({
    capturedAtIso: input.capturedAtIso,
    placeLabel: input.placeLabel,
    memoText: input.memoText,
  });
  return { event: draft, match: null, createdNewEvent: true };
}

export async function ingestSearchMediaCapture(file: File): Promise<SearchCaptureIngestResult> {
  const context = await attachMediaSpacetime({
    file,
    origin: "search_capture",
    originRef: "search",
  });

  const { event, match, createdNewEvent } = resolveTargetEvent({
    capturedAtIso: context.capturedAtIso,
    lat: context.lat,
    lng: context.lng,
    placeLabel: context.placeLabel,
  });

  const fragment: FeedCaptureFragment = {
    id: context.id,
    kind: captureKindFromMedia(context, "photo"),
    capturedAtIso: context.capturedAtIso,
    mediaContextId: context.id,
    placeLabel: context.placeLabel ?? undefined,
  };

  return commitCaptureToEvent({
    target: event,
    match,
    createdNewEvent,
    fragment,
  });
}

export function ingestSearchMemoCapture(text: string): SearchCaptureIngestResult {
  const trimmed = text.trim();
  const url = extractFirstUrl(trimmed);
  const capturedAtIso = new Date().toISOString();
  const { event, match, createdNewEvent } = resolveTargetEvent({
    capturedAtIso,
    lat: null,
    lng: null,
    placeLabel: null,
    memoText: trimmed,
  });

  const fragment: FeedCaptureFragment = {
    id: `memo:${Date.now()}`,
    kind: url ? "link" : "memo",
    capturedAtIso,
    label: trimmed.slice(0, 120),
    url: url ?? undefined,
    placeLabel: match?.placeLabel ?? event.place ?? undefined,
  };

  return commitCaptureToEvent({
    target: event,
    match,
    createdNewEvent,
    fragment,
  });
}

export function reassignCaptureToEvent(input: {
  fragment: FeedCaptureFragment;
  event: EventCandidate;
  match: SpacetimeFeedTargetMatch | null;
  fromEventId?: string | null;
  userConfirmedTarget?: boolean;
}): SearchCaptureIngestResult {
  const fromEventId = input.fromEventId?.trim();
  if (fromEventId && fromEventId !== input.event.id) {
    const events = listEventCandidates();
    const source = events.find((row) => row.id === fromEventId);
    if (source) {
      commitEventUpsert({
        id: source.id,
        title: source.title,
        category: source.category,
        source: source.source,
        lifecycle: source.lifecycle,
        datetime: source.datetime,
        place: source.place,
        containerId: source.containerId,
        confidence: source.confidence,
        metadata: removeFeedCaptureFragment(source.metadata, input.fragment.id),
        lifecycleUpdatedAt: source.lifecycleUpdatedAt,
      });
    }
  }

  return commitCaptureToEvent({
    target: input.event,
    match: input.match,
    createdNewEvent: false,
    fragment: input.fragment,
    userConfirmedTarget: input.userConfirmedTarget ?? true,
  });
}
