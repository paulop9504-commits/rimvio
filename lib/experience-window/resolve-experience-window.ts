import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ExperienceBridgeSnapshot } from "@/lib/experience-bridge/experience-bridge-types";
import { resolveExperiencePeerThreadId } from "@/lib/globe/resolve-experience-peer-thread-id";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type {
  ExperienceTripTiming,
  ExperienceWindow,
} from "@/lib/experience-window/experience-window-types";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";

const TRIP_TIMING_BUFFER_MS = 12 * 60 * 60 * 1000;
const DEFAULT_TRIP_SPAN_MS = 14 * 86_400_000;

function classifyTripTiming(
  startMs: number | null,
  endMs: number | null,
  nowMs: number,
): ExperienceTripTiming {
  const start = startMs ?? endMs ?? nowMs;
  const end = endMs ?? startMs ?? nowMs;

  if (start > nowMs + TRIP_TIMING_BUFFER_MS) {
    return "future";
  }
  if (end < nowMs - TRIP_TIMING_BUFFER_MS) {
    return "past";
  }
  return "present";
}

/** Pure — resolve the shared experience window from event + optional bridge row. */
export function resolveExperienceWindow(input: {
  event: EventCandidate;
  bridge?: Pick<ExperienceBridgeSnapshot, "createdAtIso" | "peerThreadId"> | null;
  now?: Date;
}): ExperienceWindow {
  const plan = readPlanContextFromEvent(input.event);
  const windowStartIso =
    plan?.windowStartIso?.trim() || input.event.datetime?.trim() || null;
  const windowEndIso = plan?.windowEndIso?.trim() || null;
  const startMs = parseIsoMs(windowStartIso);
  const endMs = parseIsoMs(windowEndIso) ?? (startMs != null ? startMs + DEFAULT_TRIP_SPAN_MS : null);
  const nowMs = (input.now ?? new Date()).getTime();

  const peerThreadId =
    input.bridge?.peerThreadId?.trim() ||
    resolveExperiencePeerThreadId(input.event) ||
    null;

  return {
    eventId: input.event.id,
    peerThreadId,
    windowStartIso,
    windowEndIso,
    bridgeCreatedAtIso: input.bridge?.createdAtIso?.trim() || null,
    tripTiming: classifyTripTiming(startMs, endMs, nowMs),
  };
}
