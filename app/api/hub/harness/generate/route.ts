import { NextResponse } from "next/server";
import { generateHarnessFromUtterance } from "@/lib/harness/nl-agent";
import type { HarnessSandboxSurface } from "@/lib/harness/labelling";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const utterance = typeof record.utterance === "string" ? record.utterance : "";
  const surface =
    record.surface === "local" || record.surface === "web"
      ? (record.surface as HarnessSandboxSurface)
      : undefined;

  const result = generateHarnessFromUtterance({ utterance, surface });
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
