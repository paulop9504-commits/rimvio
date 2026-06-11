import type { EventCandidate } from "@/lib/events/event-candidate";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import type { ExperienceBridgeSnapshot } from "@/lib/experience-bridge/experience-bridge-types";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";

/** Participant accept → personal globe pin (same eventId, own entry lens). */
export function ensureBridgeParticipantPin(input: {
  bridge: ExperienceBridgeSnapshot;
  peerThreadId?: string | null;
}): PersonalGlobePin {
  const threadId =
    input.peerThreadId?.trim() ||
    input.bridge.peerThreadId?.trim() ||
    null;

  const event: EventCandidate = {
    ...input.bridge.eventSnapshot,
    metadata: {
      ...input.bridge.eventSnapshot.metadata,
      [EXPERIENCE_BRIDGE_META_KEYS.bridgeId]: input.bridge.eventId,
      [EXPERIENCE_BRIDGE_META_KEYS.hostUserId]: input.bridge.hostUserId,
      ...(threadId
        ? { [EXPERIENCE_BRIDGE_META_KEYS.peerThreadId]: threadId }
        : {}),
      experienceBridgeParticipant: true,
    },
  };

  const { photoCount, videoCount } = countEventMedia(event);
  const { pin } = createPersonalGlobePinFromEvent({
    event,
    experienceTitle: input.bridge.title,
    shareWithPeerThreadIds: threadId ? [threadId] : [],
  });

  return {
    ...pin,
    experienceTitle: input.bridge.title,
    placeLabel: input.bridge.placeLabel,
    lat: input.bridge.lat,
    lng: input.bridge.lng,
    photoCount,
    videoCount,
  };
}
