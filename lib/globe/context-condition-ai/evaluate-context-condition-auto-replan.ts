import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { WeatherContext } from "@/lib/context-resolver/types";
import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { refineLocalDiscoverySpec } from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";

export type ContextConditionAutoReplanTrigger =
  | "weather_rain"
  | "calendar_soon"
  | "calendar_break";

export type ContextConditionAutoReplanOutcome = {
  trigger: ContextConditionAutoReplanTrigger;
  reasonKo: string;
  refineMessage: string;
  nextSpec: LocalDiscoveryActionSpec;
};

const SOON_MINUTES = 90;
const BREAK_MINUTES = 180;

function isRainy(weather: WeatherContext | null | undefined): boolean {
  if (!weather) {
    return false;
  }
  if (weather.condition === "rain" || weather.condition === "snow") {
    return true;
  }
  return (weather.precipitation_chance ?? 0) >= 0.55;
}

function minutesUntil(iso: string | null | undefined, now: Date): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  return Math.round((ms - now.getTime()) / 60_000);
}

/** Weather + calendar signals → optional auto replan for bound 맥락 AI. */
export function evaluateContextConditionAutoReplan(input: {
  event: EventCandidate;
  spec: LocalDiscoveryActionSpec;
  weather: WeatherContext | null | undefined;
  now?: Date;
  lastTrigger?: ContextConditionAutoReplanTrigger | null;
}): ContextConditionAutoReplanOutcome | null {
  const now = input.now ?? new Date();
  const last = input.lastTrigger ?? null;

  if (isRainy(input.weather) && input.spec.vibe !== "quiet" && last !== "weather_rain") {
    const refineMessage = "비 오니까 실내·조용한 곳으로";
    return {
      trigger: "weather_rain",
      reasonKo: "비 예보가 있어서 실내·조용한 쪽으로 다시 맞출게요",
      refineMessage,
      nextSpec: refineLocalDiscoverySpec(input.spec, refineMessage),
    };
  }

  const context = buildContextInstance({ event: input.event });
  const untilStart = minutesUntil(context.time.startIso, now);
  if (
    untilStart != null &&
    untilStart >= 0 &&
    untilStart <= SOON_MINUTES &&
    last !== "calendar_soon"
  ) {
    const refineMessage = "더 가까운 곳";
    return {
      trigger: "calendar_soon",
      reasonKo: "일정이 가까워서 더 가까운 후보로 다시 맞출게요",
      refineMessage,
      nextSpec: refineLocalDiscoverySpec(input.spec, refineMessage),
    };
  }

  const untilEnd = minutesUntil(context.time.endIso, now);
  if (
    untilEnd != null &&
    untilEnd >= 0 &&
    untilEnd <= BREAK_MINUTES &&
    last !== "calendar_break"
  ) {
    const refineMessage =
      context.time.dayPart === "evening" || context.time.dayPart === "night"
        ? "근처 저녁 맛집"
        : "근처 카페";
    return {
      trigger: "calendar_break",
      reasonKo: "일정 사이 시간이라 근처 후보로 다시 맞출게요",
      refineMessage,
      nextSpec: refineLocalDiscoverySpec(input.spec, refineMessage),
    };
  }

  return null;
}
