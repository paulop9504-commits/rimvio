import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  generatePairingCode,
  PC_AGENT_PAIRING_CODE_TTL_MS,
} from "@/lib/pc-local-agent";

export async function POST() {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + PC_AGENT_PAIRING_CODE_TTL_MS).toISOString();

  const { error } = await admin.from("pc_local_agent_pairing_codes").insert({
    user_id: auth.user.id,
    code,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code, expiresAt });
}
