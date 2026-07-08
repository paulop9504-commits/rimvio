export type ParsedContextConditionResourceId = {
  readonly contextEventId: string;
  readonly kind: "lodging" | "eatery" | "activity" | "amenity";
  readonly placeId: string;
};

function parseKind(
  trimmed: string,
  marker: string,
  kind: ParsedContextConditionResourceId["kind"],
): ParsedContextConditionResourceId | null {
  const index = trimmed.lastIndexOf(marker);
  if (index <= 0) {
    return null;
  }
  const contextEventId = trimmed.slice(0, index).trim();
  const placeId = trimmed.slice(index + marker.length).trim();
  if (!contextEventId || !placeId) {
    return null;
  }
  return { contextEventId, kind, placeId };
}

/** `{eventId}:lodging:{placeId}` · `{eventId}:eatery:{placeId}` · `{eventId}:activity:{placeId}` */
export function parseContextConditionResourceId(
  resourceId: string,
): ParsedContextConditionResourceId | null {
  const trimmed = resourceId.trim();
  return (
    parseKind(trimmed, ":lodging:", "lodging") ??
    parseKind(trimmed, ":activity:", "activity") ??
    parseKind(trimmed, ":amenity:", "amenity") ??
    parseKind(trimmed, ":eatery:", "eatery")
  );
}
