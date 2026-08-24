import { createServiceRoleClient } from "@/lib/supabase/admin";
import { seedBuiltinCapabilities } from "@/lib/pc-local-agent/capability-server";
import {
  DEFAULT_PC_AGENT_PERMISSIONS,
  type PcAgentPermissions,
} from "@/lib/pc-local-agent/pc-permissions";
import { generateDeviceToken, hashDeviceToken } from "@/lib/pc-local-agent/token";
import type { PcAgentDevice } from "@/lib/pc-local-agent/types";

export async function registerPcDevice(input: {
  userId: string;
  deviceName: string;
  permissions?: PcAgentPermissions;
}): Promise<{ device: PcAgentDevice; deviceToken: string } | { error: string; status: number }> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { error: "service_unavailable", status: 503 };
  }

  const now = new Date().toISOString();
  const permissions = input.permissions ?? DEFAULT_PC_AGENT_PERMISSIONS;
  const name = input.deviceName.trim() || "My PC";

  const insertWithPerms = await admin
    .from("pc_local_agent_devices")
    .insert({
      user_id: input.userId,
      name,
      type: "PC",
      status: "ONLINE",
      last_seen_at: now,
      permissions,
    })
    .select("*")
    .single();

  let device = insertWithPerms.data;
  if (insertWithPerms.error || !device) {
    const fallback = await admin
      .from("pc_local_agent_devices")
      .insert({
        user_id: input.userId,
        name,
        type: "PC",
        status: "ONLINE",
        last_seen_at: now,
      })
      .select("*")
      .single();
    if (fallback.error || !fallback.data) {
      return {
        error: fallback.error?.message ?? insertWithPerms.error?.message ?? "device_create_failed",
        status: 500,
      };
    }
    device = fallback.data;
  }

  const deviceToken = generateDeviceToken();
  const { error: tokenError } = await admin.from("pc_local_agent_device_tokens").insert({
    device_id: device.id,
    token_hash: hashDeviceToken(deviceToken),
  });

  if (tokenError) {
    await admin.from("pc_local_agent_devices").delete().eq("id", device.id);
    return { error: tokenError.message, status: 500 };
  }

  await seedBuiltinCapabilities(device.id);
  return { device: device as PcAgentDevice, deviceToken };
}
