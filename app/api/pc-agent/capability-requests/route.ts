import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getCapabilityDefinitions } from "@/lib/pc-local-agent/capabilities";
import type { CapabilityRequest } from "@/lib/pc-local-agent/capabilities/types";

export async function GET() {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("pc_local_agent_capability_requests")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = (data ?? []) as CapabilityRequest[];
  const enriched = requests.map((req) => ({
    ...req,
    capabilities: getCapabilityDefinitions(req.required_capabilities),
  }));

  return NextResponse.json({ requests: enriched });
}
