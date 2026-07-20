/**
 * Amenity / pharmacy lookup cue — routes Search → pharmacy.lookup.
 */

const AMENITY_LOOKUP_CUE =
  /(?:약국|편의점|atm|은행|병원|의원|주유|마트|슈퍼|세탁|우체국|pharmacy|convenience|hospital|clinic)/iu;

export function isAmenityLookupQuery(text: string): boolean {
  return AMENITY_LOOKUP_CUE.test(text.trim());
}

/** Prefer pharmacy-shaped query for Maps / seed when cue is thin. */
export function composeAmenityLookupQuery(query: string): string {
  const q = query.trim() || "약국";
  if (AMENITY_LOOKUP_CUE.test(q)) {
    return q;
  }
  return `약국 ${q}`.trim();
}
