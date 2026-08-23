import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateDeviceToken, hashDeviceToken } from "@/lib/pc-local-agent";
import { seedBuiltinCapabilities } from "@/lib/pc-local-agent/capability-server";

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

  const { data: device, error: deviceError } = await admin
    .from("pc_local_agent_devices")
    .insert({
      user_id: pairing.user_id,
      name: deviceName,
      type: "PC",
      status: "ONLINE",
      last_seen_at: now,
    })
    .select("*")
    .single();

  if (deviceError || !device) {
    return NextResponse.json(
      { error: deviceError?.message ?? "device_create_failed" },
      { status: 500 },
    );
  }

  const deviceToken = generateDeviceToken();
  const { error: tokenError } = await admin.from("pc_local_agent_device_tokens").insert({
    device_id: device.id,
    token_hash: hashDeviceToken(deviceToken),
  });

  if (tokenError) {
    await admin.from("pc_local_agent_devices").delete().eq("id", device.id);
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  await admin
    .from("pc_local_agent_pairing_codes")
    .update({
      consumed_at: now,
      device_id: device.id,
    })
    .eq("id", pairing.id);

  await seedBuiltinCapabilities(device.id);

  return NextResponse.json({
    deviceId: device.id,
    deviceToken,
    deviceName: device.name,
  });
}
