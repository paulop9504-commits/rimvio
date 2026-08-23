import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { markStaleDevicesOffline } from "@/lib/pc-local-agent/server-auth";
import { expireStaleWaitingTasks } from "@/lib/pc-local-agent/capability-server";

export async function GET() {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  await markStaleDevicesOffline(auth.user.id);
  await expireStaleWaitingTasks(auth.user.id);

  const { data, error } = await admin
    .from("pc_local_agent_devices")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ devices: data ?? [] });
}
