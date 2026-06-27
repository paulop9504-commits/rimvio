/** L0 ontology — feed capture kind (SSOT). */
export type FeedCaptureKind = "photo" | "video" | "link" | "memo" | "gps_dwell";

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
};
