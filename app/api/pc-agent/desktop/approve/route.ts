import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { localAgentCallbackUrl } from "@/lib/pc-local-agent/desktop-connect";
import { parsePcAgentPermissions } from "@/lib/pc-local-agent/pc-permissions";
import { registerPcDevice } from "@/lib/pc-local-agent/register-pc-device";
import { generateExchangeCode, hashDeviceToken } from "@/lib/pc-local-agent/token";

type Body = {
  nonce?: string;
  permissions?: unknown;
};

export async function POST(request: NextRequest) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const nonce = body.nonce?.trim();
  if (!nonce) {
    return NextResponse.json({ error: "missing_nonce" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { data: session } = await admin
    .from("pc_local_agent_desktop_sessions")
    .select("*")
    .eq("nonce", nonce)
    .maybeSingle();

  if (!session || session.expires_at <= now) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 401 });
  }

  if (session.status === "approved" || session.status === "exchanged") {
    return NextResponse.json({ error: "already_used" }, { status: 409 });
  }

  const permissions = parsePcAgentPermissions(body.permissions ?? session.permissions);
  const registered = await registerPcDevice({
    userId: auth.user.id,
    deviceName: session.device_name || "My PC",
    permissions,
  });
  if ("error" in registered) {
    return NextResponse.json({ error: registered.error }, { status: registered.status });
  }

  const exchange = generateExchangeCode();
  const { error } = await admin
    .from("pc_local_agent_desktop_sessions")
    .update({
      status: "approved",
      user_id: auth.user.id,
      device_id: registered.device.id,
      exchange_hash: hashDeviceToken(exchange),
      pending_token: registered.deviceToken,
      permissions,
    })
    .eq("id", session.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const callbackUrl = localAgentCallbackUrl({
    nonce,
    exchange,
    port: session.callback_port,
  });

  return NextResponse.json({
    ok: true,
    deviceId: registered.device.id,
    deviceName: registered.device.name,
    callbackUrl,
    exchange,
  });
}
