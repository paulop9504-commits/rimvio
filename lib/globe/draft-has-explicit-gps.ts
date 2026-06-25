import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";

/** User/GPS/EXIF picked coordinates — do not overwrite with text geocode. */
export function draftHasExplicitGps(draft: GlobePhotoIngestDraft): boolean {
  const anchor = draft.clusters[0]?.anchor;
  if (!anchor?.hasGps) {
    return false;
  }
  const lat = anchor.lat;
  const lng = anchor.lng;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}
