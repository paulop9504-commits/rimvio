import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDmThreadPartnerMember } from "@/lib/peer-chat/dm-friend-add-server";
import { normalizeEmail } from "@/lib/peer-chat/email";
import { ensureRimvioUserProfile } from "@/lib/peer-chat/ensure-user-profile";
import type { PeerMessageRow, PeerThreadRow } from "@/lib/peer-chat/types";
import type { Database } from "@/types/database";

const MESSAGE_LIMIT = 200;

const DM_SEP = "__";

/** Stable DM room id for two Rimvio accounts (UUID-safe delimiter). */
export function buildDmThreadId(userIdA: string, userIdB: string): string {
  const [a, b] = [userIdA, userIdB].sort();
  return `peer-dm-${a}${DM_SEP}${b}`;
}

export function isDmThreadId(threadId: string): boolean {
  return threadId.startsWith("peer-dm-") && threadId.includes(DM_SEP);
}

export function extractOtherUserIdFromDmThread(
  threadId: string,
  currentUserId: string,
): string | null {
  if (!isDmThreadId(threadId)) {
    return null;
  }
  const body = threadId.slice("peer-dm-".length);
  const [a, b] = body.split(DM_SEP);
  if (a === currentUserId) {
    return b ?? null;
  }
  if (b === currentUserId) {
    return a ?? null;
  }
  return null;
}

export async function ensureDmThreadBetweenUsers(
  supabase: SupabaseClient<Database>,
  input: {
    callerUserId: string;
    otherUserId: string;
    callerDisplayName: string;
    otherDisplayName: string;
  },
): Promise<{ thread: PeerThreadRow; threadId: string }> {
  const threadId = buildDmThreadId(input.callerUserId, input.otherUserId);
  const { thread } = await ensurePeerThread(supabase, {
    threadId,
    displayName: input.callerDisplayName,
    userId: input.callerUserId,
  });
  await ensureDmThreadPartnerMember(supabase, {
    threadId,
    partnerUserId: input.otherUserId,
  });
  return { thread, threadId };
}

export type UserProfileRecord = {
  phone_e164: string | null;
  email_lower: string | null;
  rimvio_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function lookupUserIdByPhone(
  supabase: SupabaseClient<Database>,
  phoneE164: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("lookup_user_id_by_phone", {
    p_phone_e164: phoneE164,
  });

  if (error) {
    throw error;
  }

  return (data as string | null) ?? null;
}

export async function lookupUserIdByEmail(
  supabase: SupabaseClient<Database>,
  emailLower: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("lookup_user_id_by_email", {
    p_email_lower: emailLower,
  });

  if (error) {
    throw error;
  }

  return (data as string | null) ?? null;
}

export async function lookupUserIdByRimvioId(
  supabase: SupabaseClient<Database>,
  rimvioId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("lookup_user_id_by_rimvio_id", {
    p_rimvio_id: rimvioId,
  });

  if (error) {
    throw error;
  }

  return (data as string | null) ?? null;
}

export async function upsertUserProfile(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    phoneE164?: string | null;
    emailLower?: string | null;
    rimvioId?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  },
) {
  const existing = await readUserProfile(supabase, input.userId);
  const phone = input.phoneE164 ?? existing?.phone_e164 ?? null;
  const email = input.emailLower ?? existing?.email_lower ?? null;
  const rimvioId = input.rimvioId ?? existing?.rimvio_id ?? null;
  const avatarUrl =
    input.avatarUrl !== undefined
      ? input.avatarUrl
      : (existing?.avatar_url ?? null);

  if (!phone && !email && !rimvioId) {
    throw new Error("Phone, email, or Rimvio ID required for profile.");
  }

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: input.userId,
      phone_e164: phone,
      email_lower: email,
      rimvio_id: rimvioId,
      display_name:
        input.displayName?.trim() || existing?.display_name || null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

const CONTACT_MATCH_LIMIT = 400;

export type MatchedContactUser = {
  user_id: string;
  phone_e164: string;
  display_name: string | null;
  rimvio_id: string | null;
};

export async function matchUsersByPhones(
  supabase: SupabaseClient<Database>,
  phones: string[],
): Promise<MatchedContactUser[]> {
  const unique = [...new Set(phones)].slice(0, CONTACT_MATCH_LIMIT);
  if (unique.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc("match_users_by_phones", {
    p_phones: unique,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as MatchedContactUser[];
}

export async function registerFriendsFromPhoneContacts(
  supabase: SupabaseClient<Database>,
  input: {
    callerUserId: string;
    callerDisplayName: string;
    entries: Array<{ name: string; phoneE164: string }>;
  },
): Promise<{
  friends: Array<{
    threadId: string;
    displayName: string;
    phoneE164: string;
    rimvioId: string | null;
  }>;
  scanned: number;
  matched: number;
}> {
  const phones = input.entries.map((e) => e.phoneE164);
  const nameByPhone = new Map(
    input.entries.map((e) => [e.phoneE164, e.name] as const),
  );
  const matches = await matchUsersByPhones(supabase, phones);
  const friends: Array<{
    threadId: string;
    displayName: string;
    phoneE164: string;
    rimvioId: string | null;
  }> = [];

  for (const match of matches) {
    const displayName =
      nameByPhone.get(match.phone_e164)?.trim() ||
      match.display_name ||
      match.rimvio_id ||
      "친구";

    const { threadId } = await ensureDmThreadBetweenUsers(supabase, {
      callerUserId: input.callerUserId,
      otherUserId: match.user_id,
      callerDisplayName: displayName,
      otherDisplayName: input.callerDisplayName,
    });

    friends.push({
      threadId,
      displayName,
      phoneE164: match.phone_e164,
      rimvioId: match.rimvio_id,
    });
  }

  return {
    friends,
    scanned: input.entries.length,
    matched: friends.length,
  };
}

export async function setUserRimvioId(
  supabase: SupabaseClient<Database>,
  input: { userId: string; rimvioId: string; displayName?: string | null },
) {
  const existing = await readUserProfile(supabase, input.userId);
  await upsertUserProfile(supabase, {
    userId: input.userId,
    rimvioId: input.rimvioId,
    phoneE164: existing?.phone_e164 ?? null,
    emailLower: existing?.email_lower ?? null,
    displayName: input.displayName ?? existing?.display_name ?? null,
  });
}

export async function patchUserProfile(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    emailLower?: string | null;
    displayName?: string | null;
    phoneE164?: string | null;
    rimvioId?: string;
    avatarUrl?: string | null;
  },
): Promise<UserProfileRecord | null> {
  const existing = await readUserProfile(supabase, input.userId);
  const emailLower =
    input.emailLower ?? existing?.email_lower ?? null;
  const phoneE164 =
    input.phoneE164 !== undefined
      ? input.phoneE164
      : (existing?.phone_e164 ?? null);
  const rimvioId =
    input.rimvioId !== undefined
      ? input.rimvioId
      : (existing?.rimvio_id ?? null);
  const displayName =
    input.displayName !== undefined
      ? input.displayName
      : (existing?.display_name ?? null);
  const avatarUrl =
    input.avatarUrl !== undefined
      ? input.avatarUrl
      : (existing?.avatar_url ?? null);

  if (!phoneE164 && !emailLower && !rimvioId) {
    throw new Error(
      "Rimvio ID, 이메일, 또는 전화번호 중 하나는 남겨 두어야 합니다.",
    );
  }

  await upsertUserProfile(supabase, {
    userId: input.userId,
    phoneE164,
    emailLower,
    rimvioId,
    displayName,
    avatarUrl,
  });

  return readUserProfile(supabase, input.userId);
}

/** @deprecated use upsertUserProfile */
export async function upsertUserPhoneProfile(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    phoneE164: string;
    displayName?: string | null;
  },
) {
  return upsertUserProfile(supabase, {
    userId: input.userId,
    phoneE164: input.phoneE164,
    displayName: input.displayName,
  });
}

export async function readUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserProfileRecord | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("phone_e164, email_lower, rimvio_id, display_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserProfileRecord | null;
}

/** @deprecated use readUserProfile */
export async function readUserPhoneProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return readUserProfile(supabase, userId);
}

export async function syncUserProfileFromAuth(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    email?: string | null;
    displayName?: string | null;
    phoneE164?: string | null;
  },
) {
  const emailLower = normalizeEmail(input.email ?? "");
  const existing = await readUserProfile(supabase, input.userId);

  if (!emailLower && !input.phoneE164 && !existing?.rimvio_id && !existing) {
    return null;
  }

  await upsertUserProfile(supabase, {
    userId: input.userId,
    phoneE164: input.phoneE164 ?? existing?.phone_e164 ?? null,
    emailLower: emailLower ?? existing?.email_lower ?? null,
    rimvioId: existing?.rimvio_id ?? null,
    displayName:
      input.displayName ??
      existing?.display_name ??
      null,
  });

  return readUserProfile(supabase, input.userId);
}

export async function listDmThreadsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<
  Array<{
    threadId: string;
    displayName: string;
    otherUserId: string | null;
  }>
> {
  const { data: memberships, error: memberError } = await supabase
    .from("peer_thread_members")
    .select("thread_id")
    .eq("user_id", userId);

  if (memberError) {
    throw memberError;
  }

  const threadIds = (memberships ?? [])
    .map((row) => row.thread_id as string)
    .filter((id) => isDmThreadId(id));

  if (threadIds.length === 0) {
    return [];
  }

  const { data: threads, error: threadError } = await supabase
    .from("peer_threads")
    .select("id, display_name, owner_user_id")
    .in("id", threadIds);

  if (threadError) {
    throw threadError;
  }

  return (threads ?? []).map((thread) => ({
    threadId: thread.id as string,
    displayName: (thread.display_name as string) || "친구",
    otherUserId: extractOtherUserIdFromDmThread(thread.id as string, userId),
  }));
}

export async function ensurePeerThread(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    displayName: string;
    userId: string;
  },
): Promise<{ thread: PeerThreadRow; created: boolean }> {
  const { data: existing, error: readError } = await supabase
    .from("peer_threads")
    .select("*")
    .eq("id", input.threadId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existing) {
    await ensureMember(supabase, input.threadId, input.userId);
    return { thread: existing as PeerThreadRow, created: false };
  }

  if (!isDmThreadId(input.threadId)) {
    throw new Error(
      "not_registered:가입한 Rimvio 사용자만 대화할 수 있어요. 친구를 ID·번호·이메일로 추가해 주세요.",
    );
  }

  const otherUserId = extractOtherUserIdFromDmThread(input.threadId, input.userId);
  if (!otherUserId) {
    throw new Error(
      "not_registered:유효한 1:1 대화방이 아니에요. 친구를 다시 추가해 주세요.",
    );
  }

  const callerOk = await ensureRimvioUserProfile(supabase, input.userId);
  const otherOk = await ensureRimvioUserProfile(supabase, otherUserId);
  if (!callerOk || !otherOk) {
    throw new Error(
      "not_registered:가입한 Rimvio 사용자만 대화할 수 있어요. Google로 로그인한 뒤 다시 시도해 주세요.",
    );
  }

  const roomKind = "dm";

  const { data: created, error: insertError } = await supabase
    .from("peer_threads")
    .insert({
      id: input.threadId,
      owner_user_id: input.userId,
      display_name: input.displayName.trim() || "친구",
      room_kind: roomKind,
      ai_mode: "private",
    })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  await ensureMember(supabase, input.threadId, input.userId);

  return { thread: created as PeerThreadRow, created: true };
}

async function ensureMember(
  supabase: SupabaseClient<Database>,
  threadId: string,
  userId: string,
) {
  const { error } = await supabase.from("peer_thread_members").upsert(
    {
      thread_id: threadId,
      user_id: userId,
    },
    { onConflict: "thread_id,user_id", ignoreDuplicates: true },
  );

  if (error) {
    throw error;
  }
}

export async function joinPeerThreadByInvite(
  supabase: SupabaseClient<Database>,
  input: { inviteCode: string; userId: string },
): Promise<PeerThreadRow> {
  const code = input.inviteCode.trim().toLowerCase();
  const { data: thread, error } = await supabase
    .from("peer_threads")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!thread) {
    throw new Error("Invalid invite code.");
  }

  await ensureMember(supabase, thread.id, input.userId);
  return thread as PeerThreadRow;
}

export async function listPeerMessages(
  supabase: SupabaseClient<Database>,
  threadId: string,
): Promise<PeerMessageRow[]> {
  const { data, error } = await supabase
    .from("peer_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(MESSAGE_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? []) as PeerMessageRow[];
}

export async function insertPeerMessage(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    senderUserId: string;
    body: string;
    messageType?: import("@/lib/chat-room/types").RoomMessageType;
    aiPayload?: import("@/lib/chat-room/types").AiMessagePayload | null;
  },
): Promise<PeerMessageRow> {
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new Error("Empty message.");
  }

  const { data, error } = await supabase
    .from("peer_messages")
    .insert({
      thread_id: input.threadId,
      sender_user_id: input.senderUserId,
      body: trimmed,
      message_type: input.messageType ?? "human",
      ai_payload: input.aiPayload ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PeerMessageRow;
}

export async function readPeerThread(
  supabase: SupabaseClient<Database>,
  threadId: string,
): Promise<PeerThreadRow | null> {
  const { data, error } = await supabase
    .from("peer_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PeerThreadRow | null) ?? null;
}
