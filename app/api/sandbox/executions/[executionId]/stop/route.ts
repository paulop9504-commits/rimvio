import { NextResponse } from "next/server";
import { sandboxController, serializeSandboxSession } from "@/lib/sandbox/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ executionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { executionId } = await context.params;
  const session = await sandboxController.stopSession(executionId);
  if (!session) {
    return NextResponse.json({ error: "execution_not_found" }, { status: 404 });
  }
  return NextResponse.json(serializeSandboxSession(session));
}
