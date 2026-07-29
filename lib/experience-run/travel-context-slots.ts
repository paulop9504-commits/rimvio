import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { isTravelTripAnnouncement } from "@/lib/experience-run/extract-travel-destination";
import { extractRunDestination } from "@/lib/experience-run/classify-experience-run-intent";
import {
  normalizeNaturalPlaceReply,
  resolveRunPlaceFromText,
} from "@/lib/experience-run/resolve-run-place-from-text";
import type { ExperienceRunProfile } from "@/lib/experience-run/experience-run-types";
import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  resolveConfirmedRealityAskGate,
  shouldSkipTravelSlotAsk,
} from "@/lib/workstream/resolve-confirmed-reality-ask-gate";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  resolveConfirmedRealityAskGate,
  shouldSkipTravelSlotAsk,
} from "@/lib/workstream/resolve-confirmed-reality-ask-gate";

export type TravelSlotName =
  | "destination"
  | "duration"
  | "anchor_time"
  | "origin_location";

export type TravelFilledSlots = {
  destination?: string | null;
  durationDays?: number | null;
  anchorTimeIso?: string | null;
  originLabel?: string | null;
  originLat?: number | null;
  originLng?: number | null;
};

const BUSINESS_TRIP = /(?:출장|business\s*trip|biz\s*trip|워크|업무\s*여행|미팅|회의)/iu;
const LEISURE_TRIP =
  /(?:놀러|여행(?:간|감|가|할|을)?|trip|abroad|해외)/iu;

/** Bare stay length — not calendar day-of-month inside 「7월26일」. */
const DURATION_DAYS =
  /(?<![월\/\.\d])(\d{1,2})\s*(?:일(?:간|동안|정도)?|박)(?!\s*\d)/iu;
const DURATION_NIGHTS_DAYS = /(\d{1,2})\s*박\s*(\d{1,2})\s*일/iu;
const DURATION_KO: Record<string, number> = {
  하루: 1,
  이틀: 2,
  사흘: 3,
  나흘: 4,
};

const ANCHOR_NOW =
  /^(?:지금|응|네|예|맞아|맞아요|그래|좋아|ok|okay|yes)$/iu;
const GPS_ORIGIN =
  /^(?:gps|GPS|위치|여기|지금\s*위치|gps\s*켜|gps\s*위치|현재\s*위치)/iu;

export type TravelDateRange = {
  startIso: string;
  endIso: string;
  /** Inclusive calendar days (7/26~8/1 → 7). */
  durationDays: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function dateIsoFromMonthDay(
  month: number,
  day: number,
  referenceDate: string,
  hour = 9,
  minute = 0,
): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const ref = new Date(`${referenceDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(ref.getTime())) {
    return null;
  }
  let year = ref.getFullYear();
  let candidate = new Date(year, month - 1, day, hour, minute, 0, 0);
  // If both ends likely sit in the past relative to ref, roll to next year.
  if (candidate.getTime() < ref.getTime() - 2 * 24 * 60 * 60 * 1000) {
    year += 1;
    candidate = new Date(year, month - 1, day, hour, minute, 0, 0);
  }
  if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00`;
}

function inclusiveDurationDays(startIso: string, endIso: string): number | null {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const days = Math.round((endDay - startDay) / (24 * 60 * 60 * 1000)) + 1;
  return days > 0 && days <= 90 ? days : null;
}

/**
 * Parse explicit travel windows:
 * 「7월26일부터 8월1일까지」·「7/26~8/1」·「7.26-8.1」
 */
export function parseTravelDateRangeFromText(
  message: string,
  referenceDate: string,
): TravelDateRange | null {
  const text = message.trim();
  if (!text) {
    return null;
  }

  const koRange = text.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:부터|에서)?\s*(?:~|-|—|–|～)?\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*까지)?/u,
  );
  if (koRange) {
    const startIso = dateIsoFromMonthDay(
      Number(koRange[1]),
      Number(koRange[2]),
      referenceDate,
      9,
      0,
    );
    const endIso = dateIsoFromMonthDay(
      Number(koRange[3]),
      Number(koRange[4]),
      referenceDate,
      23,
      59,
    );
    if (startIso && endIso) {
      let end = endIso;
      if (new Date(end).getTime() < new Date(startIso).getTime()) {
        // Cross-year: end before start → bump end year.
        const bumped = new Date(end);
        bumped.setFullYear(bumped.getFullYear() + 1);
        end = bumped.toISOString().replace(/\.\d{3}Z$/, "").replace(/Z$/, "");
        // Keep local-ish string shape YYYY-MM-DDTHH:mm:00
        const y = bumped.getFullYear();
        end = `${y}-${pad2(bumped.getMonth() + 1)}-${pad2(bumped.getDate())}T23:59:00`;
      }
      const durationDays = inclusiveDurationDays(startIso, end);
      if (durationDays) {
        return { startIso, endIso: end, durationDays };
      }
    }
  }

  const slashRange = text.match(
    /(\d{1,2})\s*[\/\.]\s*(\d{1,2})\s*(?:부터|에서)?\s*(?:~|-|—|–|～)\s*(\d{1,2})\s*[\/\.]\s*(\d{1,2})(?:\s*까지)?/u,
  );
  if (slashRange) {
    const startIso = dateIsoFromMonthDay(
      Number(slashRange[1]),
      Number(slashRange[2]),
      referenceDate,
      9,
      0,
    );
    let endIso = dateIsoFromMonthDay(
      Number(slashRange[3]),
      Number(slashRange[4]),
      referenceDate,
      23,
      59,
    );
    if (startIso && endIso) {
      if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
        const bumped = new Date(endIso);
        bumped.setFullYear(bumped.getFullYear() + 1);
        endIso = `${bumped.getFullYear()}-${pad2(bumped.getMonth() + 1)}-${pad2(bumped.getDate())}T23:59:00`;
      }
      const durationDays = inclusiveDurationDays(startIso, endIso);
      if (durationDays) {
        return { startIso, endIso, durationDays };
      }
    }
  }

  return null;
}

export function isLeisureTravelMessage(message: string): boolean {
  const text = message.trim();
  if (!text || BUSINESS_TRIP.test(text)) {
    return false;
  }
  return LEISURE_TRIP.test(text) || isTravelTripAnnouncement(text);
}

export function isBusinessTravelMessage(message: string): boolean {
  const text = message.trim();
  return Boolean(text) && (BUSINESS_TRIP.test(text) || isTravelTripAnnouncement(text));
}

export function travelProfileForMessage(message: string): ExperienceRunProfile | null {
  if (isBusinessTravelMessage(message) && BUSINESS_TRIP.test(message)) {
    return "business_trip";
  }
  if (isLeisureTravelMessage(message) || isTravelTripAnnouncement(message)) {
    return "leisure_travel";
  }
  return null;
}

export function parseDurationDaysFromText(message: string): number | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  const nightsDays = text.match(DURATION_NIGHTS_DAYS);
  if (nightsDays?.[2]) {
    const days = Number.parseInt(nightsDays[2], 10);
    return days > 0 && days <= 60 ? days : null;
  }
  const numeric = text.match(DURATION_DAYS);
  if (numeric?.[1]) {
    const days = Number.parseInt(numeric[1], 10);
    return days > 0 && days <= 60 ? days : null;
  }
  for (const [word, days] of Object.entries(DURATION_KO)) {
    if (text.includes(word)) {
      return days;
    }
  }
  return null;
}

export function parseAnchorTimeFromText(
  message: string,
  referenceDate: string,
): string | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  const range = parseTravelDateRangeFromText(text, referenceDate);
  if (range) {
    return range.startIso;
  }
  if (ANCHOR_NOW.test(text)) {
    return parseRelativeDateTimeFromText("지금", referenceDate) ?? new Date().toISOString();
  }
  return parseRelativeDateTimeFromText(text, referenceDate);
}

export function parseTravelSlotsFromMessage(
  message: string,
  referenceDate: string,
): TravelFilledSlots {
  const destination = extractRunDestination(message);
  const range = parseTravelDateRangeFromText(message, referenceDate);
  if (range) {
    return {
      destination: destination ?? null,
      durationDays: range.durationDays,
      anchorTimeIso: range.startIso,
      originLabel: null,
      originLat: null,
      originLng: null,
    };
  }
  const durationDays = parseDurationDaysFromText(message);
  const anchorTimeIso = parseAnchorTimeFromText(message, referenceDate);

  return {
    destination: destination ?? null,
    durationDays: durationDays ?? null,
    anchorTimeIso: anchorTimeIso ?? null,
    originLabel: null,
    originLat: null,
    originLng: null,
  };
}

export function mergeTravelSlots(
  base: TravelFilledSlots,
  patch: TravelFilledSlots,
): TravelFilledSlots {
  return {
    destination: patch.destination ?? base.destination ?? null,
    durationDays: patch.durationDays ?? base.durationDays ?? null,
    anchorTimeIso: patch.anchorTimeIso ?? base.anchorTimeIso ?? null,
    originLabel: patch.originLabel ?? base.originLabel ?? null,
    originLat: patch.originLat ?? base.originLat ?? null,
    originLng: patch.originLng ?? base.originLng ?? null,
  };
}

export function nextTravelSlot(
  slots: TravelFilledSlots,
  options?: { readonly event?: EventCandidate | null },
): TravelSlotName | null {
  const gate = options?.event
    ? resolveConfirmedRealityAskGate({ event: options.event })
    : null;

  if (!slots.destination?.trim()) {
    if (gate && shouldSkipTravelSlotAsk("destination", gate)) {
      // destination known from Reality
    } else if (!gate?.knownFacts.destinationLabel) {
      return "destination";
    }
  }
  if (!slots.durationDays) {
    if (!(gate && shouldSkipTravelSlotAsk("duration", gate))) {
      return "duration";
    }
  }
  if (!slots.anchorTimeIso?.trim()) {
    if (!(gate && shouldSkipTravelSlotAsk("anchor_time", gate))) {
      return "anchor_time";
    }
  }
  if (!slots.originLabel?.trim() && (slots.originLat == null || slots.originLng == null)) {
    if (!(gate && shouldSkipTravelSlotAsk("origin_location", gate))) {
      return "origin_location";
    }
  }
  return null;
}

export function questionForTravelSlot(
  slot: TravelSlotName,
  slots: TravelFilledSlots,
): string {
  switch (slot) {
    case "destination":
      return copy.globe.travelContext.clarifyDestination;
    case "duration":
      return copy.globe.travelContext.clarifyDuration(slots.destination ?? "여행");
    case "anchor_time":
      return copy.globe.travelContext.clarifyAnchorTime;
    case "origin_location":
      return copy.globe.travelContext.clarifyOrigin;
    default:
      return copy.globe.experienceRun.clarifyBusinessTripPlace;
  }
}

export function offerGpsForSlot(slot: TravelSlotName): boolean {
  return slot === "origin_location";
}

export function parseTravelSlotReply(input: {
  slot: TravelSlotName;
  reply: string;
  referenceDate: string;
  lat?: number | null;
  lng?: number | null;
}): TravelFilledSlots {
  const reply = input.reply.trim();

  switch (input.slot) {
    case "destination": {
      const dest =
        extractRunDestination(reply) ??
        (normalizeNaturalPlaceReply(reply) || reply);
      return { destination: dest };
    }
    case "duration": {
      const range = parseTravelDateRangeFromText(reply, input.referenceDate);
      if (range) {
        return {
          durationDays: range.durationDays,
          anchorTimeIso: range.startIso,
        };
      }
      const days = parseDurationDaysFromText(reply);
      return { durationDays: days };
    }
    case "anchor_time": {
      const range = parseTravelDateRangeFromText(reply, input.referenceDate);
      if (range) {
        return {
          anchorTimeIso: range.startIso,
          durationDays: range.durationDays,
        };
      }
      const anchor = parseAnchorTimeFromText(reply, input.referenceDate);
      return { anchorTimeIso: anchor };
    }
    case "origin_location": {
      if (
        input.lat != null &&
        input.lng != null &&
        (!reply || GPS_ORIGIN.test(reply))
      ) {
        return {
          originLabel: copy.globe.travelContext.gpsOriginLabel,
          originLat: input.lat,
          originLng: input.lng,
        };
      }
      const place = resolveRunPlaceFromText(reply);
      if (place) {
        return {
          originLabel: place.placeLabel,
          originLat: place.lat,
          originLng: place.lng,
        };
      }
      if (GPS_ORIGIN.test(reply) && input.lat != null && input.lng != null) {
        return {
          originLabel: copy.globe.travelContext.gpsOriginLabel,
          originLat: input.lat,
          originLng: input.lng,
        };
      }
      const label = normalizeNaturalPlaceReply(reply);
      return label ? { originLabel: label } : {};
    }
    default:
      return {};
  }
}

export function buildTravelContextMessage(
  seed: string,
  slots: TravelFilledSlots,
): string {
  const parts = [seed.trim()];
  if (slots.durationDays) {
    parts.push(`${slots.durationDays}일`);
  }
  if (slots.originLabel?.trim()) {
    parts.push(`${slots.originLabel}에서 출발`);
  }
  return parts.filter(Boolean).join(" ");
}

export function computeWindowEndIso(
  anchorIso: string,
  durationDays: number,
): string {
  const start = new Date(anchorIso);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(0, durationDays - 1));
  end.setHours(23, 59, 0, 0);
  return end.toISOString();
}

export function durationConfirmLine(days: number): string {
  return copy.globe.travelContext.durationConfirmed(days);
}
