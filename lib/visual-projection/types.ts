import type { RealityObjectType } from "@/lib/reality-object/types";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

/** What the image depicts — used for representativeness, not segmentation. */
export type VisualSubjectKind =
  | "food"
  | "signage"
  | "kitchen"
  | "building_exterior"
  | "room"
  | "pool"
  | "lobby"
  | "landmark_full"
  | "entrance"
  | "interior"
  | "unknown";

/** Stars 0–5 for each axis; total is 0–100. */
export type VisualScoreBreakdown = {
  readonly recognition: number;
  readonly aesthetic: number;
  readonly projection: number;
  readonly representativeness: number;
  readonly total: number;
};

export type VisualCandidate = {
  readonly url: string;
  readonly subjectHint?: VisualSubjectKind | null;
  readonly aestheticHint?: number | null;
};

export type VisualProjectionSelection = {
  readonly url: string;
  readonly subject: VisualSubjectKind;
  readonly score: VisualScoreBreakdown;
};

/** Far = glyph · mid = glyph+label · near = cover image. */
export type VisualProjectionLod =
  | "glyph"
  | "glyph_label"
  | "image";

export type ObjectHaloFamily =
  | "food"
  | "lodging"
  | "landmark"
  | "shopping"
  | "media"
  | "transit"
  | "generic";

export type ObjectHaloStyle = {
  readonly family: ObjectHaloFamily;
  readonly discoveryAccent: "green" | "blue" | "orange" | "purple";
  /** CSS color for soft halo behind the object. */
  readonly haloColor: string;
  readonly aspectRatio: "1:1" | "16:9" | "4:3";
  readonly glyph: string;
};

export type ProjectionTier = "foreground" | "background" | "hidden";

export type ResolveMarkerLodInput = {
  detailLevel: GlobeDetailLevel;
  tier?: ProjectionTier;
};
