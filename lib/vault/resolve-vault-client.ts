import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveServiceRoleOrUserClient } from "@/lib/supabase/admin";

/** Vault writes after route auth — prefer service role to avoid RLS upsert edge cases. */
export function resolveVaultClient<T extends SupabaseClient>(userClient: T): T | SupabaseClient {
  return resolveServiceRoleOrUserClient(userClient);
}
