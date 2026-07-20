import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decryptVaultPayload,
  encryptVaultPayload,
  hashVaultPlaintext,
  vaultEncryptionVersion,
} from "@/lib/vault/encrypt-vault-payload";
import {
  PERSONAL_VAULT_BUCKET,
  type UpsertVaultObjectInput,
  type UserVaultObjectRow,
  type UserVaultRow,
  type VaultObjectKind,
  type VaultObjectSummary,
} from "@/lib/vault/types";

function mapObjectSummary(row: UserVaultObjectRow): VaultObjectSummary {
  return {
    id: row.id,
    objectKey: row.object_key,
    kind: row.kind,
    byteSize: row.byte_size,
    contentHash: row.content_hash,
    updatedAt: row.updated_at,
    hasInlineCiphertext: Boolean(row.ciphertext_inline),
    hasStoragePath: Boolean(row.storage_path),
  };
}

export async function ensureUserVault(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserVaultRow> {
  const { error: rpcError } = await supabase.rpc("rimvio_ensure_user_vault", {
    p_user_id: userId,
  });
  if (rpcError) {
    const message = rpcError.message ?? "";
    // Service-role clients have no auth.uid() — RPC raises "forbidden".
    // Direct upsert works when RLS is bypassed (service role) or owner session.
    const canFallback =
      /forbidden/i.test(message) || /permission|policy|jwt/i.test(message);
    if (!canFallback) {
      throw new Error(message);
    }
    const { error: upsertError } = await supabase.from("user_vaults").upsert(
      {
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  const { data, error } = await supabase
    .from("user_vaults")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("vault_provision_failed");
  }

  return data as UserVaultRow;
}

export async function getUserVault(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserVaultRow | null> {
  const { data, error } = await supabase
    .from("user_vaults")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as UserVaultRow | null) ?? null;
}

export async function listVaultObjects(
  supabase: SupabaseClient,
  userId: string,
  kind?: VaultObjectKind,
): Promise<VaultObjectSummary[]> {
  let query = supabase
    .from("user_vault_objects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (kind) {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as UserVaultObjectRow[]).map(mapObjectSummary);
}

export async function getVaultObjectByKey(
  supabase: SupabaseClient,
  userId: string,
  objectKey: string,
): Promise<UserVaultObjectRow | null> {
  const { data, error } = await supabase
    .from("user_vault_objects")
    .select("*")
    .eq("user_id", userId)
    .eq("object_key", objectKey.trim())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as UserVaultObjectRow | null) ?? null;
}

export async function readVaultObjectPayload<T>(
  supabase: SupabaseClient,
  userId: string,
  objectKey: string,
): Promise<T | null> {
  const row = await getVaultObjectByKey(supabase, userId, objectKey);
  if (!row?.ciphertext_inline) {
    return null;
  }
  return decryptVaultPayload<T>(userId, row.ciphertext_inline);
}

export async function upsertVaultObjectInline(
  supabase: SupabaseClient,
  userId: string,
  input: UpsertVaultObjectInput,
): Promise<VaultObjectSummary> {
  await ensureUserVault(supabase, userId);

  const objectKey = input.objectKey.trim();
  if (!objectKey) {
    throw new Error("object_key_required");
  }

  const ciphertext = encryptVaultPayload(userId, input.payload);
  const contentHash = hashVaultPlaintext(input.payload);
  const storagePath = input.storagePath?.trim() || null;
  const inlineByteSize = Buffer.byteLength(ciphertext, "utf8");
  const byteSize = input.byteSize ?? inlineByteSize;
  const stamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_vault_objects")
    .upsert(
      {
        user_id: userId,
        object_key: objectKey,
        kind: input.kind,
        storage_bucket: PERSONAL_VAULT_BUCKET,
        storage_path: storagePath,
        ciphertext_inline: ciphertext,
        content_type: input.contentType ?? "application/json",
        byte_size: byteSize,
        content_hash: contentHash,
        encryption_version: vaultEncryptionVersion(),
        metadata: input.metadata ?? {},
        updated_at: stamp,
      },
      { onConflict: "user_id,object_key" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("vault_object_upsert_empty");
  }

  await supabase
    .from("user_vaults")
    .update({
      storage_used_bytes: byteSize,
      updated_at: stamp,
    })
    .eq("user_id", userId);

  return mapObjectSummary(data as UserVaultObjectRow);
}

export function buildPersonalVaultStoragePath(userId: string, objectId: string): string {
  return `${userId.trim()}/${objectId.trim()}`;
}

export async function createPersonalVaultUploadUrl(
  supabase: SupabaseClient,
  userId: string,
  input: { objectId: string; contentType?: string },
): Promise<{ path: string; signedUrl: string }> {
  const path = buildPersonalVaultStoragePath(userId, input.objectId);
  const { data, error } = await supabase.storage
    .from(PERSONAL_VAULT_BUCKET)
    .createSignedUploadUrl(path, {
      upsert: true,
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "signed_upload_url_failed");
  }

  return { path, signedUrl: data.signedUrl };
}
