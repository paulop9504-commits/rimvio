import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildGlobePinSystemBody,
  type PeerGlobePinPayload,
  type SharedGlobePin,
} from "@/lib/peer-chat/globe-pin-types";
import { listSharedGlobePinsFromMessages } from "@/lib/peer-chat/project-thread-globe-pins";
import {
  insertPeerMessage,
  listPeerMessages,
} from "@/lib/peer-chat/server-peer-chat";
import type { Database } from "@/types/database";

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

export function validateGlobePinCoords(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || lat < LAT_MIN || lat > LAT_MAX) {
    throw new Error("invalid_lat:위도가 올바르지 않아요.");
  }
  if (!Number.isFinite(lng) || lng < LNG_MIN || lng > LNG_MAX) {
    throw new Error("invalid_lng:경도가 올바르지 않아요.");
  }
}

export async function listSharedGlobePinsForThread(
  supabase: SupabaseClient<Database>,
  threadId: string,
): Promise<SharedGlobePin[]> {
  const rows = await listPeerMessages(supabase, threadId);
  return listSharedGlobePinsFromMessages(rows);
}

export async function insertSharedGlobePin(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    senderUserId: string;
    senderDisplayName: string;
    lat: number;
    lng: number;
    placeLabel: string;
    note?: string | null;
    capturedAtIso?: string;
    imageUrl?: string | null;
    mediaKind?: PeerGlobePinPayload["mediaKind"];
  },
): Promise<{ pin: SharedGlobePin; body: string }> {
  validateGlobePinCoords(input.lat, input.lng);

  const placeLabel = input.placeLabel.trim() || "이곳";
  const senderDisplayName = input.senderDisplayName.trim() || "친구";
  const capturedAtIso = input.capturedAtIso ?? new Date().toISOString();

  const payload: PeerGlobePinPayload = {
    kind: "globe_pin",
    pinId: crypto.randomUUID(),
    lat: input.lat,
    lng: input.lng,
    placeLabel,
    senderDisplayName,
    capturedAtIso,
    note: input.note?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    mediaKind: input.mediaKind ?? (input.imageUrl ? "photo" : null),
  };

  const body = buildGlobePinSystemBody({
    senderDisplayName,
    placeLabel,
    hasPhoto: Boolean(payload.imageUrl),
  });
  const row = await insertPeerMessage(supabase, {
    threadId: input.threadId,
    senderUserId: input.senderUserId,
    body,
    messageType: "system",
    aiPayload:
      payload as unknown as import("@/lib/chat-room/types").AiMessagePayload,
  });

  const pin: SharedGlobePin = {
    messageId: row.id,
    peerThreadId: row.thread_id,
    senderUserId: row.sender_user_id,
    sentAt: row.created_at,
    payload,
  };

  return { pin, body };
}
