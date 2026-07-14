import { type NextRequest, NextResponse } from "next/server";
import {
  listProviderNetworkMembers,
  mergeRemoteProviderNetworkMembers,
} from "@/lib/marketplace/provider-member-registry";
import { isProviderKind } from "@/lib/marketplace/provider-network-types";
import { listProviderNetworkMembersRemote } from "@/lib/marketplace/server/sync-provider-network-member-supabase";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Read Provider Network member directory — Supabase when configured, else local registry. */
export async function GET(request: NextRequest) {
  const kindParam = request.nextUrl.searchParams.get("kind")?.trim();
  const kind = kindParam && isProviderKind(kindParam) ? kindParam : undefined;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      source: "local",
      members: listProviderNetworkMembers(kind ? { kind } : undefined),
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const remote = await listProviderNetworkMembersRemote(supabase, { kind });
    if (remote.length > 0) {
      mergeRemoteProviderNetworkMembers(remote);
    }
    return NextResponse.json({
      ok: true,
      source: remote.length > 0 ? "supabase" : "local",
      members: listProviderNetworkMembers(kind ? { kind } : undefined),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "local_fallback",
      members: listProviderNetworkMembers(kind ? { kind } : undefined),
    });
  }
}
