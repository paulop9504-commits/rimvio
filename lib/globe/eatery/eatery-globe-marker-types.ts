/** View-only eatery marker on globe — not a context pin. */
export type GlobeEateryMapMarker = {
  markerKind: "eatery";
  id: string;
  resourceId: string;
  label: string;
  lat: number;
  lng: number;
  carouselIndex: number;
  isMain: boolean;
  thumbnailUrl: string | null;
  popInDelayMs?: number;
  discoveryShortLabel?: string | null;
  discoveryPriceLabel?: string | null;
  discoveryAccent?: "green" | "blue" | "orange" | "purple";
  virtualCandidate?: boolean;
  ontologyBadgeLabel?: string | null;
  anchorLabel?: string | null;
  relationMemoKo?: string | null;
  calloutOffsetX?: number | null;
  calloutOffsetY?: number | null;
  /** Context Condition AI — emerald delegate pin. */
  contextConditionPin?: boolean;
  /** Visual Projection Engine — floating object glyph. */
  objectGlyph?: string | null;
  objectHaloFamily?: "food" | "lodging" | "landmark" | "shopping" | "media" | "transit" | "generic" | null;
  projectionTier?: "foreground" | "background" | "hidden";
  /** Context Bloom — selected / related attention. */
  bloomRole?: "selected" | "related" | "none";
  bloomDelayMs?: number;
  /** Selective segmentation — YES only soft cutout. */
  useSegmentation?: boolean;
  cutoutMode?: "none" | "soft_blob" | "soft_pill" | "soft_ellipse";
};

export function isGlobeEateryMapMarker(value: unknown): value is GlobeEateryMapMarker {
  return (
    !!value &&
    typeof value === "object" &&
    (value as GlobeEateryMapMarker).markerKind === "eatery"
  );
}
