/**
 * When discovery cards have no photos, promote place YouTube into the hero slot.
 */
export function shouldUseDiscoveryVideoHero(input: {
  imageUrls: readonly string[];
  hasVideoContext: boolean;
}): boolean {
  const hasPhoto = input.imageUrls.some((url) => url.trim().length > 0);
  return !hasPhoto && input.hasVideoContext;
}
