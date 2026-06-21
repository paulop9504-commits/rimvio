import type { EventCandidate } from "@/lib/events/event-candidate";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export function resolveExperiencePeerThreadId(
  event: EventCandidate | null | undefined,
): string | null {
  if (!event) {
    return null;
  }
  const plan = readPlanContextFromEvent(event);
  const fromPlan = plan?.peerThreadId?.trim();
  if (fromPlan) {
    return fromPlan;
  }
  const bridgeThread = event.metadata?.[EXPERIENCE_BRIDGE_META_KEYS.peerThreadId];
  if (typeof bridgeThread === "string" && bridgeThread.trim()) {
    return bridgeThread.trim();
  }
  const raw = event.metadata?.planPeerThreadId;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return null;
}

/** Pin / bridge / conversation — first resolvable peer thread for talk. */
export function resolveExperienceTalkThreadId(input: {
  event?: EventCandidate | null;
  bridgePeerThreadId?: string | null;
  conversationPeerThreadId?: string | null;
  experienceRoomThreadId?: string | null;
}): string | null {
  const fromConversation = input.conversationPeerThreadId?.trim();
  if (fromConversation) {
    return fromConversation;
  }
  const fromBridge = input.bridgePeerThreadId?.trim();
  if (fromBridge) {
    return fromBridge;
  }
  const fromRoom = input.experienceRoomThreadId?.trim();
  if (fromRoom) {
    return fromRoom;
  }
  return resolveExperiencePeerThreadId(input.event);
}

export function buildExperienceRoomBackHref(eventId: string | null | undefined): string {
  const key = eventId?.trim();
  return key ? `/?recallEvent=${encodeURIComponent(key)}` : "/";
}
