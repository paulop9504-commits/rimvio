import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { resolvePublicSupabaseUrl } from "@/lib/supabase/resolve-public-supabase-env";

let cachedServiceRole: SupabaseClient<Database> | null | undefined;

/**
 * Server-only — bypasses RLS after route-level auth checks.
 * Reuses one HTTPS client per process (Vercel warm isolate) to cut handshake churn.
 */
export function createServiceRoleClient(): SupabaseClient<Database> | null {
  if (cachedServiceRole !== undefined) {
    return cachedServiceRole;
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    cachedServiceRole = null;
    return null;
  }
  cachedServiceRole = createClient<Database>(resolvePublicSupabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "X-Client-Info": "rimvio-service-role",
      },
    },
  });
  return cachedServiceRole;
}

/** Prefer service role for bridge writes/reads after API auth gate. */
export function resolveServiceRoleOrUserClient<T extends SupabaseClient>(
  userClient: T,
): T | SupabaseClient<Database> {
  return createServiceRoleClient() ?? userClient;
}

/** Test/hot-reload helper — do not call from request paths. */
export function resetServiceRoleClientCacheForTests(): void {
  cachedServiceRole = undefined;
}
