import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { WeatherContext } from "@/lib/context-resolver/types";
import { readPinnedLodgingResourceId } from "@/lib/globe/context-hub/pin-lodging-selection-to-context";
import { copy } from "@/lib/copy/human-ko";

export type ContextAgentPreflightBriefingInput = {
  event: EventCandidate;
  anchorPlaceName: string;
  now?: Date;
  weather?: WeatherContext | null;
};

export type ContextAgentPreflightBriefing = {
  /** Dot-separated JARVIS-style line — 「오사카 · 저녁 40분 남음 · …」 */
  briefingLineKo: string;
  segments: readonly string[];
};

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

function isRainForecast(weather: WeatherContext | null | undefined): boolean {
  if (!weather) {
    return false;
  }
  if (weather.condition === "rain" || weather.condition === "snow") {
    return true;
  }
  return (weather.precipitation_chance ?? 0) >= 0.55;
}

function resolvePlaceSegment(anchorPlaceName: string, event: EventCandidate): string {
  const fromAnchor = anchorPlaceName.trim();
  if (fromAnchor) {
    return fromAnchor;
  }
  return event.place?.trim() || event.title.trim() || copy.globe.contextConditionPanelEyebrow;
}

function resolveTimeSegment(input: {
  now: Date;
  startIso: string | null;
  dayPart: string;
}): string | null {
  const untilStart = minutesUntil(input.startIso, input.now);
  if (untilStart != null && untilStart >= 0 && untilStart <= 120) {
    if (input.dayPart === "evening" || input.dayPart === "night") {
      return copy.globe.contextAgentPreflightEveningIn(untilStart);
    }
    return copy.globe.contextAgentPreflightScheduleIn(untilStart);
  }

  const hour = input.now.getHours();
  if (hour >= 16 && hour < 19) {
    const untilDinner =
      (19 - hour) * 60 - input.now.getMinutes();
    if (untilDinner > 0 && untilDinner <= 120) {
      return copy.globe.contextAgentPreflightEveningIn(untilDinner);
    }
  }

  if (hour >= 17 && hour <= 22) {
    return copy.globe.contextAgentPreflightEveningNow;
  }
  if (hour >= 11 && hour <= 14) {
    return copy.globe.contextAgentPreflightLunchNow;
  }
  if (hour >= 6 && hour <= 10) {
    return copy.globe.contextAgentPreflightMorningNow;
  }
  return null;
}

function resolveWeatherSegment(weather: WeatherContext | null | undefined): string | null {
  if (!isRainForecast(weather)) {
    return null;
  }
  return copy.globe.contextAgentPreflightRainForecast;
}

function resolveLodgingSegment(event: EventCandidate): string | null {
  if (readPinnedLodgingResourceId(event)) {
    return null;
  }
  return copy.globe.contextAgentPreflightLodgingOpen;
}

/** Bound 맥락 AI — 3초 프리플라이트 dot briefing (비서 톤, 질문 없음). */
export function buildContextAgentPreflightBriefing(
  input: ContextAgentPreflightBriefingInput,
): ContextAgentPreflightBriefing {
  const now = input.now ?? new Date();
  const context = buildContextInstance({ event: input.event });
  const segments: string[] = [];

  segments.push(resolvePlaceSegment(input.anchorPlaceName, input.event));

  const timeSegment = resolveTimeSegment({
    now,
    startIso: context.time.startIso,
    dayPart: context.time.dayPart,
  });
  if (timeSegment) {
    segments.push(timeSegment);
  }

  const weatherSegment = resolveWeatherSegment(input.weather);
  if (weatherSegment) {
    segments.push(weatherSegment);
  }

  const lodgingSegment = resolveLodgingSegment(input.event);
  if (lodgingSegment) {
    segments.push(lodgingSegment);
  }

  return {
    briefingLineKo: segments.join(" · "),
    segments,
  };
}
