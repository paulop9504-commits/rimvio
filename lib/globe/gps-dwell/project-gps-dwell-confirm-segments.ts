import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  readFeedCaptureFragments,
  readDwellMinutesFromCaptures,
} from "@/lib/feed/feed-capture-metadata";
import { formatDwellMinutesLabel } from "@/lib/feed/project-dwell-from-gps-pings";
import {
  formatDwellTimeRange,
  resolveDwellFragmentEndIso,
} from "@/lib/globe/gps-dwell/format-dwell-time-range";
import { resolveDwellSegmentPlace } from "@/lib/globe/gps-dwell/resolve-dwell-segment-place";

export type GpsDwellConfirmSegment = {
  fragmentId: string;
  startIso: string;
  endIso: string;
  timeRangeLabel: string;
  dwellMinutes: number;
  dwellLabel: string;
  rawPlaceLabel: string;
  resolvedPlaceLabel: string;
  lat: number;
  lng: number;
  geocoded: boolean;
  verified: boolean;
};

export type GpsDwellConfirmDraft = {
  eventId: string;
  eventTitle: string;
  totalDwellMinutes: number;
  segments: GpsDwellConfirmSegment[];
};

/** Pending gps_dwell fragments → confirm sheet rows. */
export function projectGpsDwellConfirmDraft(
  event: EventCandidate | null | undefined,
): GpsDwellConfirmDraft | null {
  if (!event) {
    return null;
  }
  if (event.metadata?.targetingSource !== "gps_background") {
    return null;
  }

  const fallbackPlace =
    event.place?.trim() ||
    (typeof event.metadata?.gpsDwellPlaceLabel === "string"
      ? event.metadata.gpsDwellPlaceLabel.trim()
      : "");

  const segments = readFeedCaptureFragments(event)
    .filter((fragment) => fragment.kind === "gps_dwell")
    .map((fragment) => {
      const dwellMinutes = fragment.dwellMinutes ?? 0;
      const endIso = resolveDwellFragmentEndIso({
        startIso: fragment.capturedAtIso,
        endedAtIso: fragment.endedAtIso,
        dwellMinutes,
      });
      const place = resolveDwellSegmentPlace(fragment, fallbackPlace);
      return {
        fragmentId: fragment.id,
        startIso: fragment.capturedAtIso,
        endIso,
        timeRangeLabel: formatDwellTimeRange(fragment.capturedAtIso, endIso),
        dwellMinutes,
        dwellLabel: formatDwellMinutesLabel(dwellMinutes),
        rawPlaceLabel: place.rawLabel,
        resolvedPlaceLabel: place.resolvedLabel,
        lat: place.lat,
        lng: place.lng,
        geocoded: place.geocoded,
        verified: fragment.verified === true,
      } satisfies GpsDwellConfirmSegment;
    })
    .filter((row) => row.dwellMinutes > 0 && !row.verified);

  if (segments.length === 0) {
    return null;
  }

  return {
    eventId: event.id,
    eventTitle: event.title?.trim() || "체류 기록",
    totalDwellMinutes: readDwellMinutesFromCaptures(event) ?? 0,
    segments,
  };
}
