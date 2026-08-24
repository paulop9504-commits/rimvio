import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hashDeviceToken } from "@/lib/pc-local-agent/token";

type Body = {
  nonce?: string;
  exchange?: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const nonce = body.nonce?.trim();
  const exchange = body.exchange?.trim();
  if (!nonce || !exchange) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
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
    .eq("status", "approved")
    .maybeSingle();

  if (
    !session ||
    session.expires_at <= now ||
    !session.exchange_hash ||
    !session.device_id ||
    !session.pending_token
  ) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 401 });
  }

  if (session.exchange_hash !== hashDeviceToken(exchange)) {
    return NextResponse.json({ error: "invalid_exchange" }, { status: 401 });
  }

  const deviceToken = session.pending_token as string;
  await admin
    .from("pc_local_agent_desktop_sessions")
    .update({
      status: "exchanged",
      pending_token: null,
    })
    .eq("id", session.id);

  const { data: device } = await admin
    .from("pc_local_agent_devices")
    .select("name")
    .eq("id", session.device_id)
    .maybeSingle();

  return NextResponse.json({
    deviceId: session.device_id,
    deviceToken,
    deviceName: device?.name ?? session.device_name,
  });
}
