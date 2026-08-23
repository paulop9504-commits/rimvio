import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import {
  getCapabilityDefinition,
  isUpdateAvailable,
  listCatalogCapabilities,
} from "@/lib/pc-local-agent/capabilities";
import {
  expireStaleWaitingTasks,
  getInstalledCapabilities,
} from "@/lib/pc-local-agent/capability-server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type InstalledCapabilityView = {
  capability_id: string;
  name: string;
  version: string;
  catalogVersion: string;
  updateAvailable: boolean;
  installed_at: string;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();
  const catalog = listCatalogCapabilities();

  if (!deviceId) {
    return NextResponse.json({ catalog, installed: [] });
  }

  const admin = createServiceRoleClient();
  if (admin) {
    const { data: device } = await admin
      .from("pc_local_agent_devices")
      .select("id")
      .eq("id", deviceId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!device) {
      return NextResponse.json({ error: "device_not_found" }, { status: 404 });
    }
  }

  await expireStaleWaitingTasks(auth.user.id);

  const rows = await getInstalledCapabilities(deviceId);
  const installed: InstalledCapabilityView[] = rows.map((row) => {
    const def = getCapabilityDefinition(row.capability_id);
    const catalogVersion = def?.version ?? row.version;
    return {
      capability_id: row.capability_id,
      name: def?.name ?? row.capability_id,
      version: row.version,
      catalogVersion,
      updateAvailable: isUpdateAvailable(row.version, catalogVersion),
      installed_at: row.installed_at,
    };
  });

  return NextResponse.json({ catalog, installed });
}
