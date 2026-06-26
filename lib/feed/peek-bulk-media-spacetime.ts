"use client";

import type { BulkMediaSpacetimePeek } from "@/lib/feed/bulk-media-spacetime-types";
import { mapWithConcurrency } from "@/lib/async/map-with-concurrency";
import { resolveGlobeMediaPeekConcurrency } from "@/lib/globe/globe-media-ingest-limits";
import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";
import { listRecentGpsPings } from "@/lib/location-ping/gps-ping-store";
import { resolveCaptureSpacetime } from "@/lib/location-ping/resolve-capture-spacetime";

function inferMediaKind(file: File): BulkMediaSpacetimePeek["mediaKind"] {
  const type = file.type.trim().toLowerCase();
  if (type.startsWith("video/")) {
    return "video";
  }
  const name = file.name.trim().toLowerCase();
  if (/\.(mp4|mov|m4v|webm|mkv|avi|3gp|3g2|qt|mpeg|mpg)$/iu.test(name)) {
    return "video";
  }
  return "photo";
}

async function peekOneFile(
  file: File,
  index: number,
  pings: Awaited<ReturnType<typeof listRecentGpsPings>>,
): Promise<BulkMediaSpacetimePeek> {
  const resolved = await resolveCaptureSpacetime({ file, pings });
  const hasGps =
    resolved.lat !== null &&
    resolved.lng !== null &&
    Number.isFinite(resolved.lat) &&
    Number.isFinite(resolved.lng);
  const placeLabel =
    hasGps && resolved.lat !== null && resolved.lng !== null
      ? resolvePlaceLabelNearCoords(resolved.lat, resolved.lng)
      : null;

  return {
    index,
    capturedAtIso: resolved.capturedAtIso,
    lat: resolved.lat,
    lng: resolved.lng,
    placeLabel,
    resolveSource: resolved.resolveSource,
    mediaKind: inferMediaKind(file),
    hasGps,
  };
}

/** Read capture time + place hints without persisting media blobs. */
export async function peekBulkMediaSpacetime(
  files: readonly File[],
  hooks?: {
    onFileStart?: (index: number, file: File) => void;
    onFileComplete?: (index: number, file: File) => void;
  },
): Promise<BulkMediaSpacetimePeek[]> {
  const pings = await listRecentGpsPings();
  const concurrency = resolveGlobeMediaPeekConcurrency();

  const peeks = await mapWithConcurrency(files, concurrency, async (file, index) => {
    hooks?.onFileStart?.(index, file);
    const peek = await peekOneFile(file, index, pings);
    hooks?.onFileComplete?.(index, file);
    return peek;
  });

  return peeks.sort((left, right) => left.index - right.index);
}
