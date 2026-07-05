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
};

export function isGlobeEateryMapMarker(value: unknown): value is GlobeEateryMapMarker {
  return (
    !!value &&
    typeof value === "object" &&
    (value as GlobeEateryMapMarker).markerKind === "eatery"
  );
}
