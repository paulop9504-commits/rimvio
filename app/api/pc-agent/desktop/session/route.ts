import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  PC_AGENT_DESKTOP_SESSION_TTL_MS,
  PC_AGENT_LOCAL_CALLBACK_PORT,
  pcConnectAppUrl,
} from "@/lib/pc-local-agent/desktop-connect";
import { generateDesktopNonce } from "@/lib/pc-local-agent/token";

type Body = {
  deviceName?: string;
  callbackPort?: number;
};

export async function POST(request: NextRequest) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const nonce = generateDesktopNonce();
  const callbackPort =
    typeof body.callbackPort === "number" && body.callbackPort > 0
      ? body.callbackPort
      : PC_AGENT_LOCAL_CALLBACK_PORT;
  const deviceName = body.deviceName?.trim() || "My PC";
  const expiresAt = new Date(Date.now() + PC_AGENT_DESKTOP_SESSION_TTL_MS).toISOString();

  const { error } = await admin.from("pc_local_agent_desktop_sessions").insert({
    nonce,
    status: "pending",
    device_name: deviceName,
    callback_port: callbackPort,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  return NextResponse.json({
    nonce,
    approveUrl: pcConnectAppUrl(origin, nonce),
    expiresAt,
  });
}

export async function GET(request: NextRequest) {
  const nonce = request.nextUrl.searchParams.get("nonce")?.trim();
  if (!nonce) {
    return NextResponse.json({ error: "missing_nonce" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { data } = await admin
    .from("pc_local_agent_desktop_sessions")
    .select("status, expires_at, device_name")
    .eq("nonce", nonce)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const expired = data.expires_at <= now;
  return NextResponse.json({
    status: expired && data.status === "pending" ? "expired" : data.status,
    deviceName: data.device_name,
  });
}
