import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import {
  readVaultObjectPayload,
  upsertVaultObjectInline,
  type VaultObjectKind,
} from "@/lib/vault";
import { resolveVaultClient } from "@/lib/vault/resolve-vault-client";

type PutBody = {
  objectKey?: string;
  kind?: VaultObjectKind;
  payload?: unknown;
  contentType?: string | null;
  metadata?: Record<string, unknown>;
  storagePath?: string | null;
  byteSize?: number;
};

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  const supabase = await tryCreateClient();

  if (!userId || !supabase) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const objectKey = new URL(request.url).searchParams.get("objectKey")?.trim();
  if (!objectKey) {
    return NextResponse.json({ error: "object_key_required" }, { status: 400 });
  }

  try {
    const db = resolveVaultClient(supabase);
    const payload = await readVaultObjectPayload(db, userId, objectKey);
    if (payload == null) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ objectKey, payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "vault_read_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await getAuthUserId();
  const supabase = await tryCreateClient();

  if (!userId || !supabase) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const objectKey = body.objectKey?.trim();
  const kind = body.kind;
  if (!objectKey || !kind) {
    return NextResponse.json({ error: "object_key_and_kind_required" }, { status: 400 });
  }
  if (body.payload === undefined) {
    return NextResponse.json({ error: "payload_required" }, { status: 400 });
  }

  try {
    const db = resolveVaultClient(supabase);
    const object = await upsertVaultObjectInline(db, userId, {
      objectKey,
      kind,
      payload: body.payload,
      contentType: body.contentType,
      metadata: body.metadata,
      storagePath: body.storagePath,
      byteSize: body.byteSize,
    });
    return NextResponse.json({ ok: true, object });
  } catch (error) {
    const message = error instanceof Error ? error.message : "vault_write_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
