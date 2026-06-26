/** Hide raw coordinate strings in user-facing market copy. */
export function isCoordPlaceLabel(label: string | null | undefined): boolean {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) {
    return false;
  }
  if (/^-?\d+(\.\d+)?\s*°?\s*,\s*-?\d+(\.\d+)?\s*°?$/u.test(trimmed)) {
    return true;
  }
  if (/^\d+\.\d+\s*°?\s*,\s*-?\d+\.\d+/u.test(trimmed)) {
    return true;
  }
  return false;
}

export function formatMarketPlaceLabel(label: string | null | undefined): string {
  const trimmed = label?.trim() ?? "";
  if (!trimmed || isCoordPlaceLabel(trimmed)) {
    return "";
  }
  return trimmed;
}
