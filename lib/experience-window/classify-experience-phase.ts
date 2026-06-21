import type { ExperiencePhase, ExperienceWindow } from "@/lib/experience-window/experience-window-types";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";

const LIVE_PAD_MS = 6 * 60 * 60 * 1000;
const DEFAULT_TRIP_SPAN_MS = 14 * 86_400_000;

/** Classify one occurred-at instant into prep / live / recall / outside. */
export function classifyExperiencePhase(
  occurredAtIso: string,
  window: ExperienceWindow,
): ExperiencePhase {
  const occurredMs = parseIsoMs(occurredAtIso);
  if (occurredMs === null) {
    return "outside";
  }

  const startMs = parseIsoMs(window.windowStartIso);
  const endMs =
    parseIsoMs(window.windowEndIso) ??
    (startMs != null ? startMs + DEFAULT_TRIP_SPAN_MS : null);
  const bridgeMs = parseIsoMs(window.bridgeCreatedAtIso);

  if (bridgeMs != null && occurredMs < bridgeMs - LIVE_PAD_MS) {
    return "outside";
  }

  if (startMs != null) {
    const liveStart = startMs - LIVE_PAD_MS;
    const liveEnd = (endMs ?? startMs) + LIVE_PAD_MS;

    if (bridgeMs != null && occurredMs >= bridgeMs && occurredMs < liveStart) {
      return "prep";
    }

    if (occurredMs >= liveStart && occurredMs <= liveEnd) {
      return "live";
    }

    if (occurredMs > liveEnd) {
      return "recall";
    }
  }

  if (bridgeMs != null && occurredMs >= bridgeMs) {
    return window.tripTiming === "past" ? "recall" : "live";
  }

  return "outside";
}

export function stampTimelineItemPhase<T extends { capturedAtIso: string }>(
  items: readonly T[],
  window: ExperienceWindow,
): Array<T & { phase: ExperiencePhase }> {
  return items.map((row) => ({
    ...row,
    phase: classifyExperiencePhase(row.capturedAtIso, window),
  }));
}
