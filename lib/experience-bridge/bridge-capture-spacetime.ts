/** Bridge SQL + jsonb — spacetime dedupe fields (Tier A). */
export type BridgeCaptureSpacetime = {
  /** SHA-256 hex — cross-device dedupe. */
  fileHash?: string | null;
  /** EXIF / capture time; defaults to capturedAtIso. */
  takenAtIso?: string | null;
  geohash?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Supabase storage object path (experience-bridge bucket). */
  storagePath?: string | null;
  byteSize?: number | null;
};

export type BridgeContributionCapture = import("@/lib/feed/feed-capture-types").FeedCaptureFragment &
  BridgeCaptureSpacetime & {
    ownerUserId?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
  };

export const BRIDGE_CAPTURE_SPACETIME_KEYS = [
  "fileHash",
  "takenAtIso",
  "geohash",
  "lat",
  "lng",
  "storagePath",
  "byteSize",
] as const satisfies readonly (keyof BridgeCaptureSpacetime)[];
