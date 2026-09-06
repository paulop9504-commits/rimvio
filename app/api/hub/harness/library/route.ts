import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createClient } from "@/lib/supabase/server";
import { parseUserHarnessUpsertBody } from "@/lib/harness/personal-registry";
import {
  listOwnUserHarnesses,
  upsertOwnUserHarness,
} from "@/lib/harness/user-harness-server";

export async function GET() {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const supabase = await createClient();
    const items = await listOwnUserHarnesses(supabase, auth.user.id);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseUserHarnessUpsertBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const item = await upsertOwnUserHarness(supabase, auth.user.id, parsed.input);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upsert_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
