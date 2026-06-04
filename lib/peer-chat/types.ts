import type { AiMessagePayload } from "@/lib/chat-room/types";
import type { RoomMessageType } from "@/lib/chat-room/types";

export type PeerMessageRow = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  message_type: RoomMessageType;
  ai_payload: AiMessagePayload | null;
  created_at: string;
};
export type PeerThreadRow = {
  id: string;
  owner_user_id: string;
  display_name: string;
  invite_code: string;
  created_at: string;
};

export type PeerThreadEnsureResult = {
  threadId: string;
  inviteCode: string;
  displayName: string;
};
