import { normalizeCaptureTimeAnchor } from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";
import {
  buildPulseScheduleHref,
  inferQuietHourLabel,
} from "@/lib/globe/trend-bridge/build-pulse-schedule-href";
import type { PinPulsePlaceContext } from "@/lib/globe/trend-bridge/server/fetch-pin-pulse-place-context";
import {
  buildKakaoMapRouteHref,
  buildKakaoMapRouteWebHref,
} from "@/lib/resolvers/deep-links";

export type PulseMainActionMode = "align" | "avoid";
export type PulseMainActionPrimaryKind = "navigate" | "schedule";

export type PulseMainActionOffer = {
  eventId: string;
  placeLabel: string;
  lat: number;
  lng: number;
  headline: string;
  body: string;
  mode: PulseMainActionMode;
  primaryKind: PulseMainActionPrimaryKind;
  primaryLabel: string;
  navigateHref: string;
  navigateWebHref: string;
  scheduleHref: string | null;
  secondaryKind: "navigate" | "schedule" | null;
  secondaryLabel: string | null;
  featureId: "navigate" | "schedule";
  sourceRef: "pulse:memory_align" | "pulse:memory_avoid";
  peakHour: string | null;
  quietHour: string | null;
  tasteMatch: boolean;
  timingAligned: boolean;
};

function readPeakStartHour(peakHourLabel: string): number | null {
  const match = peakHourLabel.match(/^(\d{2}):00/u);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  return Number.isFinite(hour) ? hour : null;
}

function isNowNearPeakHour(peakHourLabel: string, now: Date, windowHours = 1): boolean {
  const peakStart = readPeakStartHour(peakHourLabel);
  if (peakStart === null) {
    return false;
  }
  const anchor = normalizeCaptureTimeAnchor({
    timestamp: now.toISOString(),
    timeZone: "Asia/Seoul",
  });
  if (!anchor) {
    return false;
  }
  const diff = Math.abs(anchor.hourStart - peakStart);
  return diff <= windowHours || diff >= 24 - windowHours;
}

function memoryHourMatchesPeak(
  captureAtIso: string | null,
  peakHourLabel: string,
): boolean {
  if (!captureAtIso?.trim()) {
    return false;
  }
  const memoryAnchor = normalizeCaptureTimeAnchor({
    timestamp: captureAtIso,
    timeZone: "Asia/Seoul",
  });
  const peakStart = readPeakStartHour(peakHourLabel);
  if (!memoryAnchor || peakStart === null) {
    return false;
  }
  return memoryAnchor.hourStart === peakStart;
}

function isCrowdHeavy(pulse: PinPulsePlaceContext): boolean {
  return (
    pulse.trendVelocity === "high" || (pulse.contributorCount ?? 0) >= 5
  );
}

function buildNavigateHrefs(memory: {
  placeLabel: string;
  lat: number;
  lng: number;
}) {
  const place = memory.placeLabel.trim();
  return {
    navigateHref: buildKakaoMapRouteHref({
      lat: memory.lat,
      lng: memory.lng,
      placeLabel: place,
    }),
    navigateWebHref: buildKakaoMapRouteWebHref({
      lat: memory.lat,
      lng: memory.lng,
      placeLabel: place,
    }),
  };
}

/**
 * Memories + Pulse → one MAIN offer (cognitive dissonance reducer).
 * Collective signal only supports personal timing — never a standalone hot-list card.
 */
export function resolvePulseMainAction(input: {
  honorific: string;
  mode?: PulseMainActionMode;
  memory: {
    eventId: string;
    placeLabel: string;
    lat: number;
    lng: number;
    captureAtIso: string | null;
  } | null;
  pulse: PinPulsePlaceContext | null;
  copy: {
    headlineAlign: (place: string) => string;
    headlineNow: (place: string) => string;
    headlineAvoid: (place: string) => string;
    bodyTaste: (name: string, place: string, peakHour: string) => string;
    bodyNow: (place: string, peakHour: string) => string;
    bodyPattern: (place: string, peakHour: string) => string;
    bodyAvoid: (place: string, quietHour: string, peakHour: string) => string;
    ctaNavigate: string;
    ctaSchedule: string;
    ctaNavigateAnyway: string;
  };
  now?: Date;
}): PulseMainActionOffer | null {
  const memory = input.memory;
  const pulse = input.pulse;
  if (!memory?.placeLabel?.trim()) {
    return null;
  }
  if (!pulse?.peakHour?.trim()) {
    return null;
  }

  const mode = input.mode ?? "align";
  const peakHour = pulse.peakHour.trim();
  const now = input.now ?? new Date();
  const place = memory.placeLabel.trim();
  const name = input.honorific.trim() || "당신";
  const { navigateHref, navigateWebHref } = buildNavigateHrefs(memory);
  const timingNow = isNowNearPeakHour(peakHour, now);
  const patternMatch = memoryHourMatchesPeak(memory.captureAtIso, peakHour);
  const tasteMatch = pulse.tasteMatch === true;

  if (mode === "avoid") {
    if (!timingNow || !isCrowdHeavy(pulse)) {
      return null;
    }
    const quietHour = inferQuietHourLabel(peakHour) ?? peakHour;
    const scheduleHref = buildPulseScheduleHref({
      placeLabel: place,
      peakHour,
      quietHour,
      mode: "avoid",
    });
    return {
      eventId: memory.eventId,
      placeLabel: place,
      lat: memory.lat,
      lng: memory.lng,
      headline: input.copy.headlineAvoid(place),
      body: input.copy.bodyAvoid(place, quietHour, peakHour),
      mode: "avoid",
      primaryKind: "schedule",
      primaryLabel: input.copy.ctaSchedule,
      navigateHref,
      navigateWebHref,
      scheduleHref,
      secondaryKind: "navigate",
      secondaryLabel: input.copy.ctaNavigateAnyway,
      featureId: "schedule",
      sourceRef: "pulse:memory_avoid",
      peakHour,
      quietHour,
      tasteMatch,
      timingAligned: timingNow,
    };
  }

  if (!tasteMatch && !timingNow && !patternMatch) {
    return null;
  }

  const headline = timingNow
    ? input.copy.headlineNow(place)
    : input.copy.headlineAlign(place);

  const body = tasteMatch
    ? input.copy.bodyTaste(name, place, peakHour)
    : timingNow
      ? input.copy.bodyNow(place, peakHour)
      : input.copy.bodyPattern(place, peakHour);

  const scheduleHref =
    timingNow || patternMatch
      ? buildPulseScheduleHref({
          placeLabel: place,
          peakHour,
          mode: "align",
        })
      : null;

  return {
    eventId: memory.eventId,
    placeLabel: place,
    lat: memory.lat,
    lng: memory.lng,
    headline,
    body,
    mode: "align",
    primaryKind: "navigate",
    primaryLabel: input.copy.ctaNavigate,
    navigateHref,
    navigateWebHref,
    scheduleHref,
    secondaryKind: scheduleHref ? "schedule" : null,
    secondaryLabel: scheduleHref ? input.copy.ctaSchedule : null,
    featureId: "navigate",
    sourceRef: "pulse:memory_align",
    peakHour,
    quietHour: null,
    tasteMatch,
    timingAligned: timingNow,
  };
}
