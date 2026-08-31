import { NextResponse, type NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { deleteHubConnectionForUser } from "@/lib/hub/dev/hub-connection-server-store";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import { tryCreateClient } from "@/lib/supabase/server";

const VALID_PROVIDERS: readonly HubPlatformProviderId[] = [
  "github",
  "vercel",
  "supabase",
  "stripe",
];

type RouteContext = {
  params: Promise<{ provider: string }>;
};

function isHubProvider(value: string): value is HubPlatformProviderId {
  return (VALID_PROVIDERS as readonly string[]).includes(value);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { provider: raw } = await context.params;

  if (!isHubProvider(raw)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }

  await deleteHubConnectionForUser(supabase, userId, raw);
  return NextResponse.json({ ok: true, provider: raw });
}
