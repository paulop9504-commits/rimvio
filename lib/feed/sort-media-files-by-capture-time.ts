import { readImageExifMetadata } from "@/lib/location-ping/read-image-exif-metadata";
import { isConstrainedMobileDevice } from "@/lib/platform/device";

const MOBILE_EXIF_CONCURRENCY = 2;

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index]!, index);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

/** Bulk EXIF ingest — oldest capture first; mobile uses low concurrency to avoid OOM. */
export async function sortMediaFilesByCaptureTime(
  files: readonly File[],
): Promise<File[]> {
  const concurrency = isConstrainedMobileDevice() ? MOBILE_EXIF_CONCURRENCY : 4;
  const ranked = await mapWithConcurrency(files, concurrency, async (file) => {
    const exif = await readImageExifMetadata(file);
    const fromExif = exif.dateTimeIso ? Date.parse(exif.dateTimeIso) : Number.NaN;
    const ms = Number.isNaN(fromExif) ? file.lastModified : fromExif;
    return { file, ms };
  });
  return ranked.sort((left, right) => left.ms - right.ms).map((row) => row.file);
}
