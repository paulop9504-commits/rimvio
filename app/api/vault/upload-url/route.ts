import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthUserId } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { createPersonalVaultUploadUrl, ensureUserVault } from "@/lib/vault";
import { resolveVaultClient } from "@/lib/vault/resolve-vault-client";
import {
  isVaultMigrationMissingError,
  vaultMigrationRequiredResponse,
} from "@/lib/vault/vault-api-errors";

type PostBody = {
  objectId?: string;
  contentType?: string;
};

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  const supabase = await tryCreateClient();

  if (!userId || !supabase) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let body: PostBody = {};
  try {
    body = (await request.json()) as PostBody;
  } catch {
    /* optional body */
  }

  const objectId = body.objectId?.trim() || randomUUID();

  try {
    const db = resolveVaultClient(supabase);
    await ensureUserVault(db, userId);
    const signed = await createPersonalVaultUploadUrl(db, userId, {
      objectId,
      contentType: body.contentType,
    });
    return NextResponse.json({
      objectId,
      bucket: "personal-vault",
      path: signed.path,
      signedUrl: signed.signedUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_url_failed";
    if (isVaultMigrationMissingError(message)) {
      return NextResponse.json(vaultMigrationRequiredResponse(), { status: 503 });
    }
    return NextResponse.json(
      { error: message, hint: "vault_unavailable" },
      { status: 503 },
    );
  }
}
