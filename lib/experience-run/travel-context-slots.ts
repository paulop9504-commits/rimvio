import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { isTravelTripAnnouncement } from "@/lib/experience-run/extract-travel-destination";
import { extractRunDestination } from "@/lib/experience-run/classify-experience-run-intent";
import {
  normalizeNaturalPlaceReply,
  resolveRunPlaceFromText,
} from "@/lib/experience-run/resolve-run-place-from-text";
import type { ExperienceRunProfile } from "@/lib/experience-run/experience-run-types";
import { copy } from "@/lib/copy/human-ko";

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

const DURATION_DAYS =
  /(\d{1,2})\s*(?:일|박)(?:\s*(?:정도|동안|다녀|머물))?/iu;
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

export function nextTravelSlot(slots: TravelFilledSlots): TravelSlotName | null {
  if (!slots.destination?.trim()) {
    return "destination";
  }
  if (!slots.durationDays) {
    return "duration";
  }
  if (!slots.anchorTimeIso?.trim()) {
    return "anchor_time";
  }
  if (!slots.originLabel?.trim() && (slots.originLat == null || slots.originLng == null)) {
    return "origin_location";
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
      const days = parseDurationDaysFromText(reply);
      return { durationDays: days };
    }
    case "anchor_time": {
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
