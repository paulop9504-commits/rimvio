import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { isBridgeSharedEvent } from "@/lib/globe/is-bridge-shared-event";
import type {
  BridgeNode,
  CaptureNode,
  ExperienceNode,
  ExperienceSubgraph,
} from "@/lib/ontology/nodes/types";

export function projectExperienceNode(event: EventCandidate): ExperienceNode {
  return {
    objectKind: "experience",
    id: event.id,
    title: event.title.trim(),
    category: event.category,
    lifecycle: event.lifecycle,
    place: event.place?.trim() || null,
    datetime: event.datetime?.trim() || null,
  };
}

export function projectCaptureNodes(event: EventCandidate): CaptureNode[] {
  return readFeedCaptureFragments(event).map((capture) => ({
    objectKind: "capture" as const,
    id: capture.id,
    experienceId: event.id,
    kind: capture.kind,
    capturedAtIso: capture.capturedAtIso,
    placeLabel: capture.placeLabel?.trim() || null,
    label: capture.label?.trim() || null,
    url: capture.url?.trim() || null,
    mediaContextId: capture.mediaContextId?.trim() || null,
    ownerUserId: capture.ownerUserId?.trim() || null,
    verified: capture.verified === true,
  }));
}

export function projectBridgeNode(event: EventCandidate): BridgeNode | null {
  if (!isBridgeSharedEvent(event)) {
    return null;
  }
  const meta = event.metadata ?? {};
  const bridgeId =
    typeof meta[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === "string"
      ? meta[EXPERIENCE_BRIDGE_META_KEYS.bridgeId].trim()
      : event.id;
  const role = meta.experienceBridgeHost
    ? ("host" as const)
    : meta.experienceBridgeParticipant
      ? ("participant" as const)
      : null;
  const peerThreadId =
    typeof meta[EXPERIENCE_BRIDGE_META_KEYS.peerThreadId] === "string"
      ? meta[EXPERIENCE_BRIDGE_META_KEYS.peerThreadId].trim()
      : null;
  const hostUserId =
    typeof meta[EXPERIENCE_BRIDGE_META_KEYS.hostUserId] === "string"
      ? meta[EXPERIENCE_BRIDGE_META_KEYS.hostUserId].trim()
      : null;

  return {
    objectKind: "bridge",
    id: `bridge:${bridgeId}`,
    experienceId: event.id,
    bridgeId,
    role,
    peerThreadId,
    hostUserId,
  };
}

/** Experience + captures + bridge — read-only subgraph from EventCandidate SSOT. */
export function projectExperienceSubgraph(event: EventCandidate): ExperienceSubgraph {
  return {
    experience: projectExperienceNode(event),
    captures: projectCaptureNodes(event),
    bridge: projectBridgeNode(event),
  };
}
