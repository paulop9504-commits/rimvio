import type { ExperienceBridgeTimelineItem } from "@/lib/experience-bridge/experience-bridge-types";
import { canEditBridgeMedia } from "@/lib/experience-bridge/bridge-access";
import { isPeerGlobePinPayload } from "@/lib/peer-chat/globe-pin-types";
import { PEER_MESSAGE_IMAGE_PLACEHOLDER } from "@/lib/peer-chat/peer-chat-image-constants";
import type { PeerMessageRow } from "@/lib/peer-chat/types";

function isChatTextBody(body: string, hasImage: boolean): boolean {
  const trimmed = body.trim();
  if (!trimmed) {
    return false;
  }
  if (hasImage && trimmed === PEER_MESSAGE_IMAGE_PLACEHOLDER) {
    return false;
  }
  return true;
}

/** Text-only peer messages → bridge timeline (media via contributions). */
export function projectPeerMessagesToTimeline(input: {
  messages: readonly PeerMessageRow[];
  viewerUserId: string;
  participantNames?: ReadonlyMap<string, string>;
}): ExperienceBridgeTimelineItem[] {
  const names = input.participantNames ?? new Map<string, string>();
  const items: ExperienceBridgeTimelineItem[] = [];

  for (const row of input.messages) {
    if (row.message_type === "system" && isPeerGlobePinPayload(row.ai_payload)) {
      continue;
    }

    const imageUrl = row.image_url?.trim() || null;
    if (imageUrl) {
      continue;
    }

    if (!isChatTextBody(row.body, false)) {
      continue;
    }

    const ownerUserId = row.sender_user_id;
    items.push({
      id: `chat:${row.id}`,
      kind: "chat_message",
      capturedAtIso: row.created_at,
      ownerUserId,
      authorDisplayName: names.get(ownerUserId)?.trim() || "친구",
      body: row.body.trim(),
      viewOnly: !canEditBridgeMedia({
        viewerUserId: input.viewerUserId,
        ownerUserId,
      }),
    });
  }

  return items;
}
