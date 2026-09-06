import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createClient } from "@/lib/supabase/server";
import { parseUserHarnessPatchBody } from "@/lib/harness/personal-registry";
import {
  deleteOwnUserHarness,
  getOwnUserHarness,
  patchOwnUserHarness,
} from "@/lib/harness/user-harness-server";

type RouteContext = { params: Promise<{ harnessId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const { harnessId } = await context.params;
  const id = harnessId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_harness_id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const item = await getOwnUserHarness(supabase, auth.user.id, id);
    if (!item) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "get_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const { harnessId } = await context.params;
  const id = harnessId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_harness_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseUserHarnessPatchBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const item = await patchOwnUserHarness(supabase, auth.user.id, id, parsed.patch);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "patch_failed";
    const status = message === "not_found" ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const { harnessId } = await context.params;
  const id = harnessId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_harness_id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const deleted = await deleteOwnUserHarness(supabase, auth.user.id, id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
