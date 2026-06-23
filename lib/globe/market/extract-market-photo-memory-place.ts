import { resolveKoreaPlaceFromCoords } from "@/lib/globe/korea-place-from-coords";
import { readImageExifMetadata } from "@/lib/location-ping/read-image-exif-metadata";

export type MarketPhotoMemoryPlace = {
  placeLabel: string;
  lat: number;
  lng: number;
};

/** First listing photo with GPS → experience / memory place (not trade anchor). */
export async function extractMarketPhotoMemoryPlace(
  files: readonly File[],
): Promise<MarketPhotoMemoryPlace | null> {
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      continue;
    }
    const exif = await readImageExifMetadata(file);
    const lat = exif.lat;
    const lng = exif.lng;
    if (
      lat === null ||
      lng === null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      continue;
    }
    const resolved = resolveKoreaPlaceFromCoords(lat, lng);
    return {
      placeLabel: resolved.label,
      lat,
      lng,
    };
  }
  return null;
}
