import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";
import type { Database } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Supabase client for Route Handlers — session cookies must be set on the
 * outgoing NextResponse (cookieStore.set alone is not reliable on redirect).
 */
export function createClientForRoute(
  request: NextRequest,
  response: NextResponse,
) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
