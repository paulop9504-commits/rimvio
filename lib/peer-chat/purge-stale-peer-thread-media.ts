import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { PEER_CHAT_IMAGE_BUCKET } from "@/lib/peer-chat/peer-chat-image-constants";
import {
  isMediaOnlyPeerMessageBody,
  isPeerThreadInactive,
  peerChatStoragePathFromPublicUrl,
  peerThreadMediaInactiveCutoffMs,
} from "@/lib/peer-chat/peer-thread-media-retention";

type MediaRow = {
  id: string;
  image_url: string | null;
  body: string | null;
};

async function resolveThreadLastActivityIso(
  supabase: SupabaseClient<Database>,
  threadId: string,
  fallbackIso: string | null,
): Promise<string | null> {
  const { data: latest } = await supabase
    .from("peer_messages")
    .select("created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const messageAt = latest?.created_at ?? null;
  if (messageAt && fallbackIso) {
    return new Date(messageAt) > new Date(fallbackIso) ? messageAt : fallbackIso;
  }
  return messageAt ?? fallbackIso;
}

async function listUserThreadIds(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Map<string, string | null>> {
  const threads = new Map<string, string | null>();

  const { data: connections } = await supabase
    .from("friend_connections")
    .select("thread_id, last_interaction_at")
    .eq("user_id", userId)
    .not("thread_id", "is", null);

  for (const row of connections ?? []) {
    const threadId = row.thread_id as string;
    threads.set(threadId, (row.last_interaction_at as string | null) ?? null);
  }

  const { data: memberships } = await supabase
    .from("peer_thread_members")
    .select("thread_id")
    .eq("user_id", userId);

  for (const row of memberships ?? []) {
    const threadId = row.thread_id as string;
    if (!threads.has(threadId)) {
      threads.set(threadId, null);
    }
  }

  return threads;
}

/** Remove photo/video attachments when a thread had no messages for 30 days. */
export async function purgeStalePeerThreadMediaForThread(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    fallbackLastActivityIso?: string | null;
    now?: number;
  },
): Promise<number> {
  const cutoffMs = peerThreadMediaInactiveCutoffMs(input.now);
  const lastActivity = await resolveThreadLastActivityIso(
    supabase,
    input.threadId,
    input.fallbackLastActivityIso ?? null,
  );
  if (!lastActivity || !isPeerThreadInactive(lastActivity, cutoffMs, input.now)) {
    return 0;
  }

  const { data: rows, error } = await supabase
    .from("peer_messages")
    .select("id, image_url, body")
    .eq("thread_id", input.threadId)
    .not("image_url", "is", null);

  if (error || !rows?.length) {
    return 0;
  }

  const mediaRows = rows as MediaRow[];
  const storagePaths = [
    ...new Set(
      mediaRows
        .map((row) => peerChatStoragePathFromPublicUrl(row.image_url ?? ""))
        .filter((path): path is string => Boolean(path)),
    ),
  ];

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(PEER_CHAT_IMAGE_BUCKET)
      .remove(storagePaths);
    if (storageError) {
      console.error("[peer-media-purge] storage remove", storageError.message);
    }
  }

  const deleteIds = mediaRows
    .filter((row) => isMediaOnlyPeerMessageBody(row.body))
    .map((row) => row.id);
  const keepCaptionIds = mediaRows
    .filter((row) => !isMediaOnlyPeerMessageBody(row.body))
    .map((row) => row.id);

  if (deleteIds.length > 0) {
    await supabase.from("peer_messages").delete().in("id", deleteIds);
  }
  if (keepCaptionIds.length > 0) {
    await supabase
      .from("peer_messages")
      .update({ image_url: null })
      .in("id", keepCaptionIds);
  }

  return mediaRows.length;
}

export async function purgeStalePeerThreadMediaForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const threads = await listUserThreadIds(supabase, userId);
  let purged = 0;
  for (const [threadId, fallback] of threads) {
    purged += await purgeStalePeerThreadMediaForThread(supabase, {
      threadId,
      fallbackLastActivityIso: fallback,
    });
  }
  return purged;
}
