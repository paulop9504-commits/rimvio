import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveBridgeEventTime } from "@/lib/globe/bridge-weather/resolve-bridge-event-time";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type { PlanWeatherTarget } from "@/lib/plan-context/resolve-plan-weather-target";

export type BridgeContextWeatherTarget = PlanWeatherTarget & {
  eventDate: string;
  eventTimeSource: import("@/lib/globe/bridge-weather/bridge-weather-types").BridgeEventTimeSource;
};

/** Bridge context — weather at experience time, never bridge upload time. */
export function resolveBridgeContextWeatherTarget(
  event: EventCandidate,
): BridgeContextWeatherTarget | null {
  const plan = readPlanContextFromEvent(event);
  const location =
    plan?.place?.trim() || event.place?.trim() || event.title.trim();
  if (!location) {
    return null;
  }

  const eventTime = resolveBridgeEventTime(event);
  if (!eventTime) {
    return null;
  }

  return {
    location,
    targetIso: eventTime.eventAtIso,
    eventDate: eventTime.eventDate,
    eventTimeSource: eventTime.source,
  };
}
