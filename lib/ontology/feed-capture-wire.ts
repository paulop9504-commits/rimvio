/** L0 ontology — feed capture kind (SSOT). */
export type FeedCaptureKind = "photo" | "video" | "link" | "memo" | "gps_dwell";

export const FEED_CAPTURE_MEDIA_TEXT_SIGNAL_SOURCES = [
  "title",
  "description",
  "chapter",
  "subtitle",
  "transcript",
] as const;

export type FeedCaptureMediaTextSignalSource =
  (typeof FEED_CAPTURE_MEDIA_TEXT_SIGNAL_SOURCES)[number];

export type FeedCaptureMediaTextSignal = {
  source: FeedCaptureMediaTextSignalSource;
  text: string;
  startSeconds?: number;
};

export type FeedCaptureFragment = {
  id: string;
  kind: FeedCaptureKind;
  capturedAtIso: string;
  mediaContextId?: string;
  placeLabel?: string;
  label?: string;
  url?: string;
  dwellMinutes?: number;
  endedAtIso?: string;
  lat?: number;
  lng?: number;
  autoAttached?: boolean;
  verified?: boolean;
  ownerUserId?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  mediaTextSignals?: readonly FeedCaptureMediaTextSignal[];
};
