import type { PeerMessage } from "@/lib/context/peer-message-types";
import type { ExperienceBridgeTimelineItem } from "@/lib/experience-bridge/experience-bridge-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { classifyExperiencePhase } from "@/lib/experience-window/classify-experience-phase";
import type { ExperiencePhase, ExperienceWindow } from "@/lib/experience-window/experience-window-types";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { projectLatLngToMapPercent } from "@/lib/experience-graph/resolve-place-coordinates";
import { isPeerGlobePinPayload } from "@/lib/peer-chat/globe-pin-types";
import { normalizePeerMessageBody } from "@/lib/peer-chat/message-mapper";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type ContextTalkSegment = {
  id: string;
  label: string;
  placeLabel: string;
  occurredAtIso: string;
  phase: ExperiencePhase;
  lat: number;
  lng: number;
  messageIds: string[];
  mapPins: ClassifiedGlobePin[];
};

function parseDayKey(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatWeekday(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "";
  }
  return WEEKDAY_KO[new Date(ms).getDay()] ?? "";
}

export function formatContextTalkSegmentLabel(input: {
  occurredAtIso: string;
  tripTitle?: string | null;
  phase?: ExperiencePhase;
  now?: Date;
}): string {
  const dateLabel = formatPinDateLabel(input.occurredAtIso);
  const weekday = formatWeekday(input.occurredAtIso);
  const weekdayPart = weekday ? ` (${weekday})` : "";
  const now = input.now ?? new Date();
  const dayKey = parseDayKey(input.occurredAtIso);
  const todayKey = parseDayKey(now.toISOString());

  if (dayKey && todayKey && dayKey === todayKey) {
    return dateLabel ? `오늘 · ${dateLabel}${weekdayPart}` : "오늘";
  }

  const title = input.tripTitle?.trim();
  if (title && input.phase !== "outside") {
    return dateLabel ? `${title} · ${dateLabel}${weekdayPart}` : title;
  }

  return dateLabel ? `${dateLabel}${weekdayPart}` : "맥락";
}

function spacetimeFromMessage(
  message: PeerMessage,
  fallback: { lat: number; lng: number; placeLabel: string },
): { lat: number; lng: number; placeLabel: string } {
  if (message.messageType === "system" && isPeerGlobePinPayload(message.aiPayload)) {
    return {
      lat: message.aiPayload.lat,
      lng: message.aiPayload.lng,
      placeLabel: message.aiPayload.placeLabel.trim() || fallback.placeLabel,
    };
  }
  return fallback;
}

function buildMapPin(input: {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: ClassifiedGlobePin["kind"];
  capturedAtIso?: string | null;
}): ClassifiedGlobePin {
  const map = projectLatLngToMapPercent(input.lat, input.lng);
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    lat: input.lat,
    lng: input.lng,
    pinX: map.x,
    pinY: map.y,
    capturedAtIso: input.capturedAtIso ?? null,
    emphasis: "primary",
    pinShape: input.kind === "photo" || input.kind === "video" ? "dot" : "dot",
  };
}

/** Messages + bridge timeline → scroll-synced context segments for Context Talk. */
export function projectContextTalkSegments(input: {
  messages: readonly PeerMessage[];
  window: ExperienceWindow;
  event?: EventCandidate | null;
  timeline?: readonly ExperienceBridgeTimelineItem[];
  tripTitle?: string | null;
  now?: Date;
}): ContextTalkSegment[] {
  const coords = input.event
    ? resolveEventGlobeCoords(input.event)
    : { lat: 37.5665, lng: 126.978, placeLabel: input.window.peerThreadId ? "이곳" : "맥락" };

  const defaultPlace =
    coords.placeLabel?.trim() ||
    input.event?.place?.trim() ||
    input.tripTitle?.trim() ||
    "이곳";

  const humanMessages = [...input.messages]
    .filter((row) => row.author !== "ai")
    .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));

  if (humanMessages.length === 0) {
    const anchor =
      input.window.windowStartIso?.trim() ||
      input.window.bridgeCreatedAtIso?.trim() ||
      new Date().toISOString();
    return [
      {
        id: "segment:default",
        label: formatContextTalkSegmentLabel({
          occurredAtIso: anchor,
          tripTitle: input.tripTitle,
          phase: classifyExperiencePhase(anchor, input.window),
          now: input.now,
        }),
        placeLabel: defaultPlace,
        occurredAtIso: anchor,
        phase: classifyExperiencePhase(anchor, input.window),
        lat: coords.lat,
        lng: coords.lng,
        messageIds: [],
        mapPins: [],
      },
    ];
  }

  const segments: ContextTalkSegment[] = [];
  let current: ContextTalkSegment | null = null;

  const pushSegment = (segment: ContextTalkSegment) => {
    segments.push(segment);
    current = segment;
  };

  for (const message of humanMessages) {
    const hasBody = normalizePeerMessageBody(message.body, message.imageUrl).length > 0;
    const isGlobePin =
      message.messageType === "system" && isPeerGlobePinPayload(message.aiPayload);
    const hasImage =
      Boolean(message.imageUrl?.trim()) ||
      Boolean(isGlobePin && message.aiPayload?.imageUrl?.trim());
    if (!hasBody && !hasImage && !isGlobePin) {
      continue;
    }

    const dayKey = parseDayKey(message.sentAt) ?? message.id;
    const phase = classifyExperiencePhase(message.sentAt, input.window);
    const space = spacetimeFromMessage(message, {
      lat: coords.lat,
      lng: coords.lng,
      placeLabel: defaultPlace,
    });

    const needsNewSegment =
      !current ||
      parseDayKey(current.occurredAtIso) !== dayKey ||
      (isGlobePin &&
        Math.abs(current.lat - space.lat) + Math.abs(current.lng - space.lng) > 0.02);

    if (needsNewSegment) {
      pushSegment({
        id: `segment:${dayKey}:${segments.length}`,
        label: formatContextTalkSegmentLabel({
          occurredAtIso: message.sentAt,
          tripTitle: input.tripTitle,
          phase,
          now: input.now,
        }),
        placeLabel: space.placeLabel,
        occurredAtIso: message.sentAt,
        phase,
        lat: space.lat,
        lng: space.lng,
        messageIds: [],
        mapPins: [],
      });
    }

    const segment = current!;
    segment.messageIds.push(message.id);

    if (isGlobePin && message.aiPayload) {
      segment.mapPins.push(
        buildMapPin({
          id: `pin:${message.id}`,
          lat: message.aiPayload.lat,
          lng: message.aiPayload.lng,
          label: message.aiPayload.placeLabel,
          kind:
            message.aiPayload.mediaKind === "video"
              ? "video"
              : message.aiPayload.imageUrl
                ? "photo"
                : "place",
          capturedAtIso: message.aiPayload.capturedAtIso,
        }),
      );
    }

    if (hasImage) {
      segment.mapPins.push(
        buildMapPin({
          id: `media:${message.id}`,
          lat: segment.lat,
          lng: segment.lng,
          label: segment.placeLabel,
          kind: "photo",
          capturedAtIso: message.sentAt,
        }),
      );
    }
  }

  for (const row of input.timeline ?? []) {
    if (row.kind !== "photo" && row.kind !== "video" && !row.kind.includes("pin")) {
      continue;
    }
    const dayKey = parseDayKey(row.capturedAtIso);
    const target =
      segments.find((segment) => parseDayKey(segment.occurredAtIso) === dayKey) ??
      segments[segments.length - 1];
    if (!target) {
      continue;
    }
    if (target.mapPins.some((pin) => pin.id === `tl:${row.id}`)) {
      continue;
    }
    target.mapPins.push(
      buildMapPin({
        id: `tl:${row.id}`,
        lat: target.lat,
        lng: target.lng,
        label: row.placeLabel?.trim() || target.placeLabel,
        kind: row.kind.includes("video") ? "video" : "photo",
        capturedAtIso: row.capturedAtIso,
      }),
    );
  }

  return segments;
}

export function resolveContextTalkSegmentForMessage(
  segments: readonly ContextTalkSegment[],
  messageId: string,
): ContextTalkSegment | null {
  for (const segment of segments) {
    if (segment.messageIds.includes(messageId)) {
      return segment;
    }
  }
  return segments[0] ?? null;
}
