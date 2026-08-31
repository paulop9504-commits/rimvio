import { NextResponse } from "next/server";
import { sandboxController, serializeSandboxSession } from "@/lib/sandbox/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ executionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { executionId } = await context.params;
  const previous = sandboxController.getSession(executionId);
  if (!previous) {
    return NextResponse.json({ error: "execution_not_found" }, { status: 404 });
  }

  const next = sandboxController.retrySession(executionId);
  if (!next) {
    return NextResponse.json({ error: "retry_failed" }, { status: 500 });
  }

  return NextResponse.json(
    {
      ...serializeSandboxSession(next),
      retryOf: executionId,
    },
    { status: 201 },
  );
}
