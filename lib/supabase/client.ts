import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import {
  isSupabaseConfigured,
  resolvePublicSupabaseAnonKey,
  resolvePublicSupabaseUrl,
} from "@/lib/supabase/resolve-public-supabase-env";

export function createClient() {
  return createBrowserClient<Database>(
    resolvePublicSupabaseUrl(),
    resolvePublicSupabaseAnonKey(),
    {
      auth: {
        // Only `/auth/callback` exchanges the PKCE code (avoid double exchange).
        detectSessionInUrl: false,
      },
    },
  );
}

export { isSupabaseConfigured };

export function tryCreateClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient();
}
