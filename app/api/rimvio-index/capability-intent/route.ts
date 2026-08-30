import { NextResponse } from "next/server";
import { readImprovementTasks } from "@/lib/rimvio-index/improvement-task-pool";
import { resolveCapabilityIntent } from "@/lib/rimvio-index/resolve-capability-intent";

export async function GET() {
  return NextResponse.json({ ok: true, tasks: readImprovementTasks() });
}

export async function POST(request: Request) {
  let body: { utterance?: string; contextEventId?: string; marketCountry?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const utterance = body.utterance?.trim();
  if (!utterance) {
    return NextResponse.json({ ok: false, reason: "utterance_required" }, { status: 400 });
  }

  const resolution = resolveCapabilityIntent({
    utterance,
    contextEventId: body.contextEventId,
    marketCountry: body.marketCountry,
  });

  return NextResponse.json({ ok: true, resolution });
}
