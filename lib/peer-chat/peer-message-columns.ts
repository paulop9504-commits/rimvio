import {
  PEER_MESSAGE_IMAGE_PLACEHOLDER,
  PEER_MESSAGE_VIDEO_PLACEHOLDER,
} from "@/lib/peer-chat/peer-chat-image-constants";
import { inferPeerChatMediaKindFromUrl } from "@/lib/peer-chat/infer-peer-chat-media-kind";
import type { Database } from "@/types/database";
import type { PeerMessageRow } from "@/lib/peer-chat/types";

type PeerMessageInsert = Database["public"]["Tables"]["peer_messages"]["Insert"];

/** Legacy DBs may lack image_url — list without it for PostgREST compatibility. */
export const PEER_MESSAGE_LIST_COLUMNS =
  "id, thread_id, sender_user_id, body, message_type, ai_payload, created_at";

export function isMissingPeerMessageImageColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("image_url") &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("column"))
  );
}

export function buildPeerMessageInsertRow(input: {
  id?: string;
  threadId: string;
  senderUserId: string;
  body: string;
  imageUrl?: string | null;
  messageType?: PeerMessageRow["message_type"];
  aiPayload?: PeerMessageRow["ai_payload"];
}): PeerMessageInsert {
  const trimmed = input.body.trim();
  const imageUrl = input.imageUrl?.trim() || null;
  const body =
    trimmed ||
    (imageUrl
      ? inferPeerChatMediaKindFromUrl(imageUrl) === "video"
        ? PEER_MESSAGE_VIDEO_PLACEHOLDER
        : PEER_MESSAGE_IMAGE_PLACEHOLDER
      : "");

  const row: PeerMessageInsert = {
    thread_id: input.threadId,
    sender_user_id: input.senderUserId,
    body,
    message_type: input.messageType ?? "human",
    ai_payload: input.aiPayload ?? null,
    ...(input.id ? { id: input.id } : {}),
    ...(imageUrl ? { image_url: imageUrl } : {}),
  };

  return row;
}
