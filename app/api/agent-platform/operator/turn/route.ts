import { NextResponse } from "next/server";
import { runDevHubOperatorTurn, ensureRegistryReady } from "@/lib/agent-platform";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: {
    utterance?: string;
    platformId?: string;
    contextEventId?: string;
    autoExecute?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, errorKo: "invalid_json" }, { status: 400 });
  }

  const utterance = body.utterance?.trim();
  if (!utterance) {
    return NextResponse.json({ ok: false, errorKo: "utterance_required" }, { status: 400 });
  }

  await ensureRegistryReady();
  const result = await runDevHubOperatorTurn({
    utterance,
    platformId: body.platformId ?? "dev",
    contextEventId: body.contextEventId,
    autoExecute: body.autoExecute,
  });

  return NextResponse.json(result);
}
