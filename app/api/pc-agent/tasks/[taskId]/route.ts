import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const { taskId } = await context.params;
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: task, error } = await admin
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}
