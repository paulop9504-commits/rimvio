import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { parkDeviceTasksOffline } from "@/lib/pc-local-agent/task-dispatch";

type RouteContext = { params: Promise<{ deviceId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const { deviceId } = await context.params;
  let body: { action?: string; permissions?: unknown };
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: device } = await admin
    .from("pc_local_agent_devices")
    .select("*")
    .eq("id", deviceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!device) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (body.action === "test") {
    return NextResponse.json({
      ok: true,
      device,
      online: device.status === "ONLINE",
    });
  }

  if (body.action === "permissions") {
    const { parsePcAgentPermissions } = await import(
      "@/lib/pc-local-agent/pc-permissions"
    );
    const permissions = parsePcAgentPermissions(body.permissions);
    const { data: updated, error } = await admin
      .from("pc_local_agent_devices")
      .update({
        permissions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deviceId)
      .eq("user_id", auth.user.id)
      .select("*")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ device: updated });
  }

  if (body.action !== "revoke") {
    return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
  }

  await parkDeviceTasksOffline(deviceId);
  await admin
    .from("pc_local_agent_device_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("device_id", deviceId);
  const { data: updated, error } = await admin
    .from("pc_local_agent_devices")
    .update({
      status: "OFFLINE",
      updated_at: new Date().toISOString(),
    })
    .eq("id", deviceId)
    .eq("user_id", auth.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ device: updated });
}
