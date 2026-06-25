import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROFILE_AVATAR_BUCKET,
  profileCoverObjectPath,
  publicCoverUrl,
} from "@/lib/profile/avatar-storage";
import type { Database } from "@/types/database";
import { readUserProfile, upsertUserProfile } from "@/lib/peer-chat/server-peer-chat";

const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function uploadUserProfileCover(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    supabaseUrl: string;
    bytes: Buffer;
    contentType: string;
  },
): Promise<string> {
  if (!ALLOWED_UPLOAD_TYPES.has(input.contentType)) {
    throw new Error("JPEG, PNG, WebP만 올릴 수 있어요.");
  }
  if (input.bytes.byteLength > 3 * 1024 * 1024) {
    throw new Error("3MB 이하 사진만 올릴 수 있어요.");
  }

  const objectPath = profileCoverObjectPath(input.userId);
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(objectPath, input.bytes, {
      upsert: true,
      contentType: "image/jpeg",
      cacheControl: "3600",
    });

  if (uploadError) {
    throw uploadError;
  }

  const bust = Date.now();
  const coverUrl = publicCoverUrl(input.supabaseUrl, input.userId, bust);
  const existing = await readUserProfile(supabase, input.userId);

  await upsertUserProfile(supabase, {
    userId: input.userId,
    phoneE164: existing?.phone_e164 ?? null,
    emailLower: existing?.email_lower ?? null,
    rimvioId: existing?.rimvio_id ?? null,
    displayName: existing?.display_name ?? null,
    avatarUrl: existing?.avatar_url ?? null,
    statusMessage: existing?.status_message ?? null,
    coverUrl,
    coverTheme: existing?.cover_theme ?? "default",
  });

  return coverUrl;
}

export async function removeUserProfileCover(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const objectPath = profileCoverObjectPath(userId);
  await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([objectPath]);

  const existing = await readUserProfile(supabase, userId);
  if (!existing) {
    return;
  }

  await upsertUserProfile(supabase, {
    userId,
    phoneE164: existing.phone_e164,
    emailLower: existing.email_lower,
    rimvioId: existing.rimvio_id,
    displayName: existing.display_name,
    avatarUrl: existing.avatar_url,
    statusMessage: existing.status_message,
    coverUrl: null,
    coverTheme: existing.cover_theme ?? "default",
  });
}
