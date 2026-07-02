import type { AgentCoordinationAttentionEvent } from "@/lib/globe/market/coordination/agent-coordination-attention-bridge";
import type { AgentNegotiationRoomRecord } from "@/lib/globe/market/coordination/agent-negotiation-types";

export function detectAgentCoordinationAttentionChanges(input: {
  previousByHandshake: Readonly<Record<string, AgentNegotiationRoomRecord>>;
  nextRooms: readonly AgentNegotiationRoomRecord[];
  suppressSlotNeededToast?: boolean;
}): AgentCoordinationAttentionEvent[] {
  const events: AgentCoordinationAttentionEvent[] = [];

  for (const room of input.nextRooms) {
    const previous = input.previousByHandshake[room.handshakeId];
    if (!previous) {
      if (
        room.state === "WAITING_USER_INPUT" &&
        room.pendingQuestion?.ownerRole === room.viewerRole &&
        !input.suppressSlotNeededToast
      ) {
        events.push({
          handshakeId: room.handshakeId,
          productTitle: room.productTitle,
          kind: "slot_needed",
        });
      }
      if (room.state === "AGREED") {
        events.push({
          handshakeId: room.handshakeId,
          productTitle: room.productTitle,
          kind: "proposal_ready",
        });
      }
      continue;
    }

    if (
      previous.state !== "WAITING_USER_INPUT" &&
      room.state === "WAITING_USER_INPUT" &&
      room.pendingQuestion?.ownerRole === room.viewerRole &&
      !input.suppressSlotNeededToast
    ) {
      events.push({
        handshakeId: room.handshakeId,
        productTitle: room.productTitle,
        kind: "slot_needed",
      });
    }

    if (previous.state !== "AGREED" && room.state === "AGREED") {
      events.push({
        handshakeId: room.handshakeId,
        productTitle: room.productTitle,
        kind: "proposal_ready",
      });
    }

    const peerApproved =
      (room.viewerRole === "seeking" &&
        !previous.listingApprovedAtIso &&
        room.listingApprovedAtIso) ||
      (room.viewerRole === "listing" &&
        !previous.seekingApprovedAtIso &&
        room.seekingApprovedAtIso);
    if (peerApproved && room.state === "AGREED") {
      events.push({
        handshakeId: room.handshakeId,
        productTitle: room.productTitle,
        kind: "peer_approved",
      });
    }

    if (previous.state !== "APPROVED" && room.state === "APPROVED") {
      events.push({
        handshakeId: room.handshakeId,
        productTitle: room.productTitle,
        kind: "fully_approved",
      });
    }
  }

  return events;
}

export function viewerHasApprovedCoordination(
  room: AgentNegotiationRoomRecord,
): boolean {
  if (room.viewerRole === "seeking") {
    return Boolean(room.seekingApprovedAtIso);
  }
  if (room.viewerRole === "listing") {
    return Boolean(room.listingApprovedAtIso);
  }
  return false;
}
