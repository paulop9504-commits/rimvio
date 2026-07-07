export type ParsedContextConditionResourceId = {
  readonly contextEventId: string;
  readonly kind: "lodging" | "eatery";
  readonly placeId: string;
};

/** `{eventId}:lodging:{placeId}` · `{eventId}:eatery:{placeId}` */
export function parseContextConditionResourceId(
  resourceId: string,
): ParsedContextConditionResourceId | null {
  const trimmed = resourceId.trim();
  const lodgingMarker = ":lodging:";
  const eateryMarker = ":eatery:";
  const lodgingIndex = trimmed.lastIndexOf(lodgingMarker);
  if (lodgingIndex > 0) {
    const contextEventId = trimmed.slice(0, lodgingIndex).trim();
    const placeId = trimmed.slice(lodgingIndex + lodgingMarker.length).trim();
    if (!contextEventId || !placeId) {
      return null;
    }
    return { contextEventId, kind: "lodging", placeId };
  }
  const eateryIndex = trimmed.lastIndexOf(eateryMarker);
  if (eateryIndex > 0) {
    const contextEventId = trimmed.slice(0, eateryIndex).trim();
    const placeId = trimmed.slice(eateryIndex + eateryMarker.length).trim();
    if (!contextEventId || !placeId) {
      return null;
    }
    return { contextEventId, kind: "eatery", placeId };
  }
  return null;
}
