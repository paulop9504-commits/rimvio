import { NextResponse } from "next/server";
import { ensureRegistryReady, runCompositeLoop } from "@/lib/agent-platform";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    loopId?: string;
    contextEventId?: string;
    userRequest?: string;
    startStepIndex?: number;
    platformId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, errorKo: "invalid_json" }, { status: 400 });
  }

  const loopId = body.loopId?.trim();
  const contextEventId = body.contextEventId?.trim();
  if (!loopId || !contextEventId) {
    return NextResponse.json(
      { ok: false, errorKo: "loopId와 contextEventId가 필요해요." },
      { status: 400 },
    );
  }

  await ensureRegistryReady();
  const result = await runCompositeLoop({
    loopId,
    contextEventId,
    userRequest: body.userRequest,
    startStepIndex: body.startStepIndex,
    platformId: body.platformId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
