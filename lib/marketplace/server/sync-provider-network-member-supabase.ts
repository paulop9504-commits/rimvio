import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderKind, ProviderNetworkMember } from "@/lib/marketplace/provider-network-types";
import {
  providerNetworkMemberFromDbRow,
  providerNetworkMemberToDbPayload,
  type ProviderNetworkMemberDbRow,
} from "@/lib/marketplace/server/provider-network-member-row";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const TABLE = "provider_network_members";

export async function upsertProviderNetworkMemberRemote(
  supabase: SupabaseClient,
  member: ProviderNetworkMember,
): Promise<ProviderNetworkMember> {
  const payload = providerNetworkMemberToDbPayload(member);
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: "member_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const parsed = providerNetworkMemberFromDbRow(data as ProviderNetworkMemberDbRow);
  if (!parsed) {
    throw new Error("provider_network_member_parse_failed");
  }
  return parsed;
}

export async function listProviderNetworkMembersRemote(
  supabase: SupabaseClient,
  input?: { kind?: ProviderKind; limit?: number },
): Promise<ProviderNetworkMember[]> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .order("display_label", { ascending: true })
    .limit(input?.limit ?? 500);

  if (input?.kind) {
    query = query.eq("kind", input.kind);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return ((data ?? []) as ProviderNetworkMemberDbRow[])
    .map(providerNetworkMemberFromDbRow)
    .filter((row): row is ProviderNetworkMember => row != null);
}

/** Server-side sync after local registry merge — no-op without service role. */
export async function syncProviderNetworkMemberToSupabase(
  member: ProviderNetworkMember,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "supabase_not_configured" };
  }
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, reason: "service_role_unavailable" };
  }
  try {
    await upsertProviderNetworkMemberRemote(supabase, member);
    return { ok: true };
  } catch {
    return { ok: false, reason: "upsert_failed" };
  }
}

export async function fetchProviderNetworkMembersFromSupabase(input?: {
  kind?: ProviderKind;
}): Promise<ProviderNetworkMember[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return [];
  }
  try {
    return await listProviderNetworkMembersRemote(supabase, input);
  } catch {
    return [];
  }
}
