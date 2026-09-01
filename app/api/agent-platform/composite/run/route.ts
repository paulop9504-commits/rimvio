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
    resume?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, errorKo: "invalid_json" }, { status: 400 });
  }

  const loopId = body.loopId?.trim();
  const contextEventId = body.contextEventId?.trim();
  if (!contextEventId) {
    return NextResponse.json(
      { ok: false, errorKo: "contextEventId가 필요해요." },
      { status: 400 },
    );
  }

  await ensureRegistryReady();

  if (body.resume) {
    const { resumeCompositeLoop } = await import("@/lib/agent-platform/pipeline/run-composite-loop");
    const resumed = await resumeCompositeLoop({
      contextEventId,
      userRequest: body.userRequest,
      platformId: body.platformId,
    });
    if (!resumed) {
      return NextResponse.json(
        { ok: false, errorKo: "resume할 composite loop가 없어요." },
        { status: 404 },
      );
    }
    return NextResponse.json(resumed, { status: resumed.ok ? 200 : 422 });
  }

  if (!loopId) {
    return NextResponse.json(
      { ok: false, errorKo: "loopId가 필요해요." },
      { status: 400 },
    );
  }

  const result = await runCompositeLoop({
    loopId,
    contextEventId,
    userRequest: body.userRequest,
    startStepIndex: body.startStepIndex,
    platformId: body.platformId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
