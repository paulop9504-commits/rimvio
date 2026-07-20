import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import {
  ensureUserVault,
  listVaultObjects,
  type VaultObjectKind,
} from "@/lib/vault";
import { resolveVaultClient } from "@/lib/vault/resolve-vault-client";
import {
  isVaultMigrationMissingError,
  VAULT_UNAVAILABLE_HTTP_STATUS,
  vaultMigrationRequiredResponse,
} from "@/lib/vault/vault-api-errors";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  const supabase = await tryCreateClient();

  if (!userId || !supabase) {
    return NextResponse.json(
      { persisted: false, vault: null, objects: [], hint: "login_required" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const kindParam = url.searchParams.get("kind");
    const kind = kindParam?.trim() as VaultObjectKind | undefined;

    const db = resolveVaultClient(supabase);
    const vault = await ensureUserVault(db, userId);
    const objects = await listVaultObjects(db, userId, kind);

    return NextResponse.json({
      persisted: true,
      vault: {
        userId: vault.user_id,
        status: vault.status,
        storageQuotaBytes: vault.storage_quota_bytes,
        storageUsedBytes: vault.storage_used_bytes,
        cryptoScheme: vault.crypto_scheme,
        updatedAt: vault.updated_at,
      },
      objects,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "vault_read_failed";
    if (isVaultMigrationMissingError(message)) {
      return NextResponse.json(vaultMigrationRequiredResponse(), {
        status: VAULT_UNAVAILABLE_HTTP_STATUS,
      });
    }
    console.error("[vault] GET failed:", message);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: "vault_unavailable",
        persisted: false,
        vault: null,
        objects: [],
      },
      { status: VAULT_UNAVAILABLE_HTTP_STATUS },
    );
  }
}

export async function POST() {
  const userId = await getAuthUserId();
  const supabase = await tryCreateClient();

  if (!userId || !supabase) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  try {
    const db = resolveVaultClient(supabase);
    const vault = await ensureUserVault(db, userId);
    return NextResponse.json({
      ok: true,
      vault: {
        userId: vault.user_id,
        status: vault.status,
        cryptoScheme: vault.crypto_scheme,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "vault_provision_failed";
    if (isVaultMigrationMissingError(message)) {
      return NextResponse.json(vaultMigrationRequiredResponse(), {
        status: VAULT_UNAVAILABLE_HTTP_STATUS,
      });
    }
    console.error("[vault] POST failed:", message);
    return NextResponse.json(
      { ok: false, error: message, hint: "vault_unavailable" },
      { status: VAULT_UNAVAILABLE_HTTP_STATUS },
    );
  }
}
