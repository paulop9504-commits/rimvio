export type GlobeResourceReelKind = "lodging" | "eatery";

export type GlobeResourceReelSurface = "list" | "detail";

export type GlobeResourceReelSource =
  | "map_marker"
  | "discovery_card"
  | "carousel"
  | "strip"
  | "chat"
  | "palantir_brief"
  | "scout_complete";

export type GlobeResourceReelItem = {
  resourceId: string;
  kind: GlobeResourceReelKind;
  placeId: string;
  title: string;
  score100: number;
  detailReasonLine: string;
  accent: "green" | "blue" | "orange" | "purple";
  thumbnailUrl: string | null;
  lat: number;
  lng: number;
  carouselIndex: number;
  secondaryLine?: string | null;
  actionHref?: string | null;
  actionLabel?: string | null;
};

export type GlobeResourceReelFocusDetail = {
  contextEventId: string;
  resourceId?: string | null;
  kind?: GlobeResourceReelKind | null;
  carouselIndex?: number;
  surface: GlobeResourceReelSurface;
  source: GlobeResourceReelSource;
  /** Resume in-progress book/pay without bridge detour. */
  resumeIntent?: "book" | "pay" | null;
};
