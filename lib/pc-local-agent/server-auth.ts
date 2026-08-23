import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hashDeviceToken } from "@/lib/pc-local-agent/token";
import {
  PC_AGENT_HEARTBEAT_TIMEOUT_MS,
  type PcAgentDevice,
} from "@/lib/pc-local-agent/types";

export type AgentAuthContext = {
  deviceId: string;
  userId: string;
  device: PcAgentDevice;
};

function readBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization")?.trim();
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice(7).trim() || null;
}

export async function authenticatePcAgentRequest(
  request: NextRequest,
): Promise<AgentAuthContext | null> {
  const deviceId = request.headers.get("x-device-id")?.trim();
  const token = readBearerToken(request);
  if (!deviceId || !token) {
    return null;
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return null;
  }

  const tokenHash = hashDeviceToken(token);
  const { data: tokenRow } = await admin
    .from("pc_local_agent_device_tokens")
    .select("device_id, revoked_at, token_hash")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked_at || tokenRow.token_hash !== tokenHash) {
    return null;
  }

  const { data: device } = await admin
    .from("pc_local_agent_devices")
    .select("*")
    .eq("id", deviceId)
    .maybeSingle();

  if (!device) {
    return null;
  }

  return {
    deviceId,
    userId: device.user_id,
    device: device as PcAgentDevice,
  };
}

export async function markStaleDevicesOffline(userId?: string): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return;
  }

  const cutoff = new Date(Date.now() - PC_AGENT_HEARTBEAT_TIMEOUT_MS).toISOString();
  let query = admin
    .from("pc_local_agent_devices")
    .update({
      status: "OFFLINE",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "ONLINE")
    .lt("last_seen_at", cutoff);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  await query;
}

export async function touchDeviceHeartbeat(deviceId: string): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return;
  }

  const now = new Date().toISOString();
  await admin
    .from("pc_local_agent_devices")
    .update({
      status: "ONLINE",
      last_seen_at: now,
      updated_at: now,
    })
    .eq("id", deviceId);
}
