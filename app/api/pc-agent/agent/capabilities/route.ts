import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { authenticatePcAgentRequest } from "@/lib/pc-local-agent/server-auth";
import { getInstalledCapabilityIds } from "@/lib/pc-local-agent/capability-server";
import { getCapabilityDefinitions } from "@/lib/pc-local-agent/capabilities";

export async function GET(request: NextRequest) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const installedIds = await getInstalledCapabilityIds(auth.deviceId);
  const installed = getCapabilityDefinitions(installedIds);

  return NextResponse.json({ installedIds, installed });
}
