import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { registerPcDevice } from "@/lib/pc-local-agent/register-pc-device";

type ConnectBody = {
  code?: string;
  deviceName?: string;
};

export async function POST(request: NextRequest) {
  let body: ConnectBody;
  try {
    body = (await request.json()) as ConnectBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const code = body.code?.trim();
  const deviceName = body.deviceName?.trim() || "My PC";
  if (!code) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { data: pairing } = await admin
    .from("pc_local_agent_pairing_codes")
    .select("*")
    .eq("code", code)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (!pairing) {
    return NextResponse.json({ error: "invalid_or_expired_code" }, { status: 401 });
  }

  const registered = await registerPcDevice({
    userId: pairing.user_id,
    deviceName,
  });
  if ("error" in registered) {
    return NextResponse.json({ error: registered.error }, { status: registered.status });
  }

  await admin
    .from("pc_local_agent_pairing_codes")
    .update({
      consumed_at: now,
      device_id: registered.device.id,
    })
    .eq("id", pairing.id);

  return NextResponse.json({
    deviceId: registered.device.id,
    deviceToken: registered.deviceToken,
    deviceName: registered.device.name,
  });
}
