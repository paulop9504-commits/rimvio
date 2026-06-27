/** View-only lodging marker on globe — not a context pin. */
export type GlobeLodgingMapMarker = {
  markerKind: "lodging";
  id: string;
  resourceId: string;
  label: string;
  lat: number;
  lng: number;
  /** Index in full ranked carousel (not lodging-only). */
  carouselIndex: number;
  isMain: boolean;
  thumbnailUrl: string | null;
  /** Collapsed presentation while lodging focus card is open. */
  displayVariant?: "default" | "situational_label";
  /** Staged discovery pop-in delay (ms). */
  popInDelayMs?: number;
  /** Discovery mode — short map pill label. */
  discoveryShortLabel?: string | null;
  /** Discovery mode — price pill on map. */
  discoveryPriceLabel?: string | null;
  discoveryAccent?: "green" | "blue" | "orange" | "purple";
};

export function isGlobeLodgingMapMarker(
  value: unknown,
): value is GlobeLodgingMapMarker {
  return (
    !!value &&
    typeof value === "object" &&
    (value as GlobeLodgingMapMarker).markerKind === "lodging"
  );
}
