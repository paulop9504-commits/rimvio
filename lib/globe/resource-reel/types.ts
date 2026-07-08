import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

export type GlobeResourceReelKind =
  | "lodging"
  | "eatery"
  | "activity"
  | "amenity";

export type GlobeResourceReelSurface = "list" | "detail";

export type GlobeResourceReelSource =
  | "map_marker"
  | "discovery_card"
  | "carousel"
  | "strip"
  | "chat"
  | "palantir_brief"
  | "scout_complete";

/** Provenance for scout contract SSOT gate — never trip inventory on Discovery reel. */
export type GlobeResourceReelContractSource = {
  sourceKind: "batch" | "lens";
  /** batchId (scout_id) or DiscoveryLensId */
  sourceId: string;
};

export type GlobeResourceReelItem = {
  resourceId: string;
  kind: GlobeResourceReelKind;
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
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
  contractSource?: GlobeResourceReelContractSource | null;
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
