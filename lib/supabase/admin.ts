import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { resolvePublicSupabaseUrl } from "@/lib/supabase/resolve-public-supabase-env";

/** Server-only — bypasses RLS after route-level auth checks. */
export function createServiceRoleClient(): SupabaseClient<Database> | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    return null;
  }
  return createClient<Database>(resolvePublicSupabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Prefer service role for bridge writes/reads after API auth gate. */
export function resolveServiceRoleOrUserClient<T extends SupabaseClient>(
  userClient: T,
): T | SupabaseClient<Database> {
  return createServiceRoleClient() ?? userClient;
}
