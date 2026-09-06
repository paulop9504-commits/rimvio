import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { executeHarnessInBrowser } from "@/lib/harness/execute-browser";
import { dispatchHarnessToLocalAgent } from "@/lib/harness/execute-local";
import { canExecutePersonalHarness } from "@/lib/harness/personal-registry";
import { getOwnUserHarness } from "@/lib/harness/user-harness-server";
import { validateHarness } from "@/lib/harness/validate";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  let harness = record.harness;
  const libraryHarnessId =
    typeof record.libraryHarnessId === "string" ? record.libraryHarnessId.trim() : "";
  const variables =
    record.variables && typeof record.variables === "object"
      ? (record.variables as Record<string, string>)
      : undefined;
  const requireReal = record.requireReal === true;
  const approved = record.approved === true;
  const mode =
    record.mode === "local" || record.mode === "browser" || record.mode === "auto"
      ? record.mode
      : "auto";

  if (libraryHarnessId) {
    const auth = await requireAuthUser();
    if ("response" in auth) {
      return auth.response;
    }
    try {
      const supabase = await createClient();
      const owned = await getOwnUserHarness(supabase, auth.user.id, libraryHarnessId);
      if (!owned) {
        return NextResponse.json({ ok: false, error: "library_harness_not_found" }, { status: 404 });
      }
      const gate = canExecutePersonalHarness(owned);
      if (!gate.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "harness_disabled_or_invalid",
            issues: gate.issues,
            message: owned.enabled
              ? "계정 Harness가 유효하지 않습니다."
              : "이 Harness는 계정에서 꺼져 있습니다. 라이브러리에서 ON 하세요.",
          },
          { status: 403 },
        );
      }
      harness = owned.harness;
    } catch (error) {
      const message = error instanceof Error ? error.message : "library_load_failed";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  if (!harness) {
    return NextResponse.json({ ok: false, error: "harness_required" }, { status: 400 });
  }

  const parsed = validateHarness(harness);
  const preferLocal =
    mode === "local" ||
    (mode === "auto" &&
      parsed.ok &&
      (parsed.harness.runtime.type === "DESKTOP" ||
        parsed.harness.runtime.type === "PHYSICAL_DEVICE"));

  if (preferLocal) {
    const auth = await requireAuthUser();
    if ("response" in auth) {
      return NextResponse.json(
        {
          ok: false,
          error: "auth_required",
          message: "Local Agent 실행에는 로그인이 필요합니다.",
        },
        { status: 401 },
      );
    }
    const local = await dispatchHarnessToLocalAgent({
      harness,
      userId: auth.user.id,
      deviceId: typeof record.deviceId === "string" ? record.deviceId : undefined,
      variables,
    });
    return NextResponse.json(
      {
        ok: local.ok,
        mode: "local",
        taskId: local.taskId,
        deviceId: local.deviceId,
        url: local.url,
        offline: local.offline,
        error: local.error,
        message: local.message,
        runtimeKind: "local-agent",
        screenshotDataUrl: null,
        state: null,
      },
      { status: local.ok ? 200 : 422 },
    );
  }

  try {
    const result = await executeHarnessInBrowser({
      harness,
      variables,
      requireReal,
      approved,
    });
    return NextResponse.json({ ...result, mode: "browser" }, { status: result.ok ? 200 : 422 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, mode: "browser" }, { status: 500 });
  }
}
