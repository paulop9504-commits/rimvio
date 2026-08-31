import { NextResponse } from "next/server";
import { sandboxController, serializeSandboxSession } from "@/lib/sandbox/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    capability?: string;
    userRequest?: string;
    input?: Record<string, unknown>;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const capability = body.capability?.trim();
  if (!capability) {
    return NextResponse.json({ error: "capability_required" }, { status: 400 });
  }

  const session = sandboxController.createSession({
    capability,
    userRequest: body.userRequest,
    input: body.input,
  });

  return NextResponse.json(serializeSandboxSession(session), { status: 201 });
}
