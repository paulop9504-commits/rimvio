import { mapWithConcurrency } from "@/lib/async/map-with-concurrency";
import { readImageExifMetadata } from "@/lib/location-ping/read-image-exif-metadata";
import { resolveGlobeMediaPeekConcurrency } from "@/lib/globe/globe-media-ingest-limits";

/** Bulk EXIF ingest — oldest capture first; capped concurrency to avoid OOM. */
export async function sortMediaFilesByCaptureTime(
  files: readonly File[],
): Promise<File[]> {
  const concurrency = resolveGlobeMediaPeekConcurrency();
  const ranked = await mapWithConcurrency(files, concurrency, async (file) => {
    const exif = await readImageExifMetadata(file);
    const fromExif = exif.dateTimeIso ? Date.parse(exif.dateTimeIso) : Number.NaN;
    const ms = Number.isNaN(fromExif) ? file.lastModified : fromExif;
    return { file, ms };
  });
  return ranked.sort((left, right) => left.ms - right.ms).map((row) => row.file);
}
