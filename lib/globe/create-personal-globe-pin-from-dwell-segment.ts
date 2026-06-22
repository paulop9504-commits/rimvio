import type { EventCandidate } from "@/lib/events/event-candidate";
import { countEventMedia } from "@/lib/globe/count-event-media";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  findPersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import { formatDwellMinutesLabel } from "@/lib/feed/project-dwell-from-gps-pings";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type CreateDwellSegmentPinInput = {
  event: EventCandidate;
  fragmentId: string;
  lat: number;
  lng: number;
  placeLabel: string;
  startIso: string;
  dwellMinutes: number;
  usePrimaryPinId?: boolean;
};

/** One dwell segment → personal globe pin (multi-segment events use fragment pin ids). */
export function createPersonalGlobePinFromDwellSegment(
  input: CreateDwellSegmentPinInput,
): PersonalGlobePin {
  const plan = readPlanContextFromEvent(input.event);
  const { photoCount, videoCount } = countEventMedia(input.event);
  const place = input.placeLabel.trim() || "이 위치";
  const dwellLabel = formatDwellMinutesLabel(input.dwellMinutes);
  const pinId = input.usePrimaryPinId
    ? `pgpin:${input.event.id}`
    : `pgpin:${input.event.id}:${input.fragmentId}`;

  const existing =
    findPersonalGlobePinByEventId(input.event.id)?.pinId === pinId
      ? findPersonalGlobePinByEventId(input.event.id)
      : null;

  const pin: PersonalGlobePin = {
    pinId,
    eventId: input.event.id,
    lat: input.lat,
    lng: input.lng,
    placeLabel: place,
    experienceTitle:
      plan?.title?.trim() ||
      input.event.title?.trim() ||
      `${place} · ${dwellLabel}`,
    photoCount,
    videoCount,
    createdAtIso: input.startIso,
    acl: existing?.acl ?? { viewerPeerThreadIds: [] },
  };

  upsertPersonalGlobePin(pin);
  return pin;
}
