import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import {
  approveCapabilityRequest,
  cancelCapabilityRequest,
} from "@/lib/pc-local-agent/capability-server";
import { getCapabilityDefinitions } from "@/lib/pc-local-agent/capabilities";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const { requestId } = await context.params;
  let action = "approve";
  try {
    const body = (await request.json()) as { action?: string };
    action = body.action ?? "approve";
  } catch {
    // default approve
  }

  if (action === "cancel") {
    const ok = await cancelCapabilityRequest(requestId, auth.user.id);
    if (!ok) {
      return NextResponse.json({ error: "cancel_failed" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  const result = await approveCapabilityRequest(requestId, auth.user.id);
  if (!result) {
    return NextResponse.json({ error: "approve_failed" }, { status: 409 });
  }

  return NextResponse.json({
    request: result.request,
    jobs: result.jobs,
    capabilities: getCapabilityDefinitions(result.request.required_capabilities),
  });
}
