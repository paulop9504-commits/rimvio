import {
  GPS_PING_FALLBACK_LOOKBACK_MS,
  GPS_PING_MATCH_WINDOW_MS,
} from "@/lib/location-ping/constants";
import { readJpegExifDateTimeIso } from "@/lib/location-ping/read-jpeg-exif-datetime";
import type { GpsPing, SpacetimeResolveSource } from "@/lib/location-ping/types";

export type ResolvedCaptureSpacetime = {
  capturedAtIso: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  resolveSource: SpacetimeResolveSource;
  matchedPingId: string | null;
};

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function nearestPing(
  pings: readonly GpsPing[],
  targetMs: number,
  windowMs: number,
): GpsPing | null {
  let best: GpsPing | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const ping of pings) {
    const pingMs = parseMs(ping.capturedAtIso);
    if (pingMs === null) {
      continue;
    }
    const delta = Math.abs(pingMs - targetMs);
    if (delta <= windowMs && delta < bestDelta) {
      best = ping;
      bestDelta = delta;
    }
  }

  return best;
}

function latestPingBefore(
  pings: readonly GpsPing[],
  targetMs: number,
  lookbackMs: number,
): GpsPing | null {
  let best: GpsPing | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;

  for (const ping of pings) {
    const pingMs = parseMs(ping.capturedAtIso);
    if (pingMs === null || pingMs > targetMs || targetMs - pingMs > lookbackMs) {
      continue;
    }
    if (pingMs > bestMs) {
      best = ping;
      bestMs = pingMs;
    }
  }

  return best;
}

function resolveCaptureInstant(input: {
  file: File;
  exifIso: string | null;
  nowMs: number;
}): { capturedAtIso: string; resolveSource: SpacetimeResolveSource } {
  if (input.exifIso) {
    return { capturedAtIso: input.exifIso, resolveSource: "exif_datetime" };
  }

  const fileMs = input.file.lastModified;
  if (
    fileMs > 0 &&
    input.nowMs - fileMs < 30 * 24 * 60 * 60 * 1000 &&
    fileMs <= input.nowMs + 60_000
  ) {
    return {
      capturedAtIso: new Date(fileMs).toISOString(),
      resolveSource: "file_mtime",
    };
  }

  return {
    capturedAtIso: new Date(input.nowMs).toISOString(),
    resolveSource: "now",
  };
}

/** Correlate a photo/video file with the nearest GPS ping buffer entry. */
export async function resolveCaptureSpacetime(input: {
  file: File;
  pings: readonly GpsPing[];
  now?: Date;
}): Promise<ResolvedCaptureSpacetime> {
  const nowMs = (input.now ?? new Date()).getTime();
  const exifIso = await readJpegExifDateTimeIso(input.file);
  const instant = resolveCaptureInstant({
    file: input.file,
    exifIso,
    nowMs,
  });
  const targetMs = parseMs(instant.capturedAtIso) ?? nowMs;

  const matched =
    nearestPing(input.pings, targetMs, GPS_PING_MATCH_WINDOW_MS) ??
    latestPingBefore(input.pings, nowMs, GPS_PING_FALLBACK_LOOKBACK_MS);

  if (!matched) {
    return {
      capturedAtIso: instant.capturedAtIso,
      lat: null,
      lng: null,
      accuracyM: null,
      resolveSource: instant.resolveSource,
      matchedPingId: null,
    };
  }

  const matchedMs = parseMs(matched.capturedAtIso) ?? targetMs;
  const usedPing =
    Math.abs(matchedMs - targetMs) <= GPS_PING_MATCH_WINDOW_MS;

  return {
    capturedAtIso: instant.capturedAtIso,
    lat: matched.lat,
    lng: matched.lng,
    accuracyM: matched.accuracyM,
    resolveSource: usedPing ? "gps_ping" : "last_known_ping",
    matchedPingId: matched.id,
  };
}
