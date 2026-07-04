import type { EventCandidate } from "@/lib/events/event-candidate";
import { FEED_CAPTURES_META_KEY } from "@/lib/events/event-metadata-keys";
import type {
  FeedCaptureFragment,
  FeedCaptureKind,
  FeedCaptureMediaTextSignal,
  FeedCaptureMediaTextSignalSource,
} from "@/lib/ontology/feed-capture-wire";
import { FEED_CAPTURE_MEDIA_TEXT_SIGNAL_SOURCES } from "@/lib/ontology/feed-capture-wire";

function isCaptureKind(value: unknown): value is FeedCaptureKind {
  return (
    value === "photo" ||
    value === "video" ||
    value === "link" ||
    value === "memo" ||
    value === "gps_dwell"
  );
}

function isMediaTextSignalSource(value: unknown): value is FeedCaptureMediaTextSignalSource {
  return (
    typeof value === "string" &&
    FEED_CAPTURE_MEDIA_TEXT_SIGNAL_SOURCES.includes(
      value as FeedCaptureMediaTextSignalSource,
    )
  );
}

function readMediaTextSignals(value: unknown): FeedCaptureMediaTextSignal[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rows: FeedCaptureMediaTextSignal[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    const source = row.source;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    const startSeconds =
      typeof row.startSeconds === "number" && Number.isFinite(row.startSeconds)
        ? row.startSeconds
        : undefined;
    if (!isMediaTextSignalSource(source) || !text) {
      continue;
    }
    rows.push({
      source,
      text,
      startSeconds,
    });
  }

  return rows.length > 0 ? rows : undefined;
}

/** Read capture fragments from EventCandidate metadata — L0, no feed/ import. */
export function readFeedCaptureFragments(
  event: EventCandidate | null | undefined,
): FeedCaptureFragment[] {
  const raw = event?.metadata?.[FEED_CAPTURES_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .filter((item) => typeof item.id === "string" && typeof item.capturedAtIso === "string")
    .map((item) => ({
      id: item.id as string,
      kind: isCaptureKind(item.kind) ? item.kind : "memo",
      capturedAtIso:
        typeof item.capturedAtIso === "string"
          ? item.capturedAtIso
          : new Date().toISOString(),
      mediaContextId:
        typeof item.mediaContextId === "string" ? item.mediaContextId : undefined,
      placeLabel: typeof item.placeLabel === "string" ? item.placeLabel : undefined,
      label: typeof item.label === "string" ? item.label : undefined,
      url: typeof item.url === "string" ? item.url : undefined,
      dwellMinutes:
        typeof item.dwellMinutes === "number" ? item.dwellMinutes : undefined,
      endedAtIso: typeof item.endedAtIso === "string" ? item.endedAtIso : undefined,
      lat: typeof item.lat === "number" && Number.isFinite(item.lat) ? item.lat : undefined,
      lng: typeof item.lng === "number" && Number.isFinite(item.lng) ? item.lng : undefined,
      autoAttached: item.autoAttached === true ? true : undefined,
      verified: item.verified === true ? true : undefined,
      ownerUserId: typeof item.ownerUserId === "string" ? item.ownerUserId : undefined,
      authorDisplayName:
        typeof item.authorDisplayName === "string" ? item.authorDisplayName : undefined,
      authorAvatarUrl:
        typeof item.authorAvatarUrl === "string" ? item.authorAvatarUrl : undefined,
      mediaTextSignals: readMediaTextSignals(item.mediaTextSignals),
    }));
}
