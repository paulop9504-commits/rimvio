/** Hide raw coordinate strings in user-facing market copy. */
export function formatMarketPlaceLabel(label: string | null | undefined): string {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  if (/^-?\d+(\.\d+)?\s*°?\s*,\s*-?\d+(\.\d+)?\s*°?$/u.test(trimmed)) {
    return "";
  }
  if (/^\d+\.\d+\s*°?\s*,\s*-?\d+\.\d+/u.test(trimmed)) {
    return "";
  }
  return trimmed;
}
