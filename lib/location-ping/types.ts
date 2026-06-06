export type GpsPingSource = "periodic" | "upload_boost" | "foreground";

export type GpsPing = {
  id: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
  capturedAtIso: string;
  source: GpsPingSource;
};

export type SpacetimeResolveSource =
  | "exif_datetime"
  | "gps_ping"
  | "last_known_ping"
  | "file_mtime"
  | "now";

export type MediaSpacetimeOrigin =
  | "peer_chat"
  | "feed_capture"
  | "search_capture"
  | "other";

export type MediaSpacetimeContext = {
  id: string;
  capturedAtIso: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  placeLabel: string | null;
  resolveSource: SpacetimeResolveSource;
  matchedPingId: string | null;
  mediaKind: "photo" | "video" | "other";
  origin: MediaSpacetimeOrigin;
  originRef: string | null;
  fileName: string | null;
  attachedAtIso: string;
};
