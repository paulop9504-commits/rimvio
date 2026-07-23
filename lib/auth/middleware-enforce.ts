import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isAuthRequired } from "@/lib/auth/policy";
import { isProtectedRoute } from "@/lib/auth/protected-routes";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  resolvePublicSupabaseAnonKey,
  resolvePublicSupabaseUrl,
} from "@/lib/supabase/resolve-public-supabase-env";

export async function readAuthUser(
  request: NextRequest,
  response: NextResponse,
): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createServerClient<Database>(
    resolvePublicSupabaseUrl(),
    resolvePublicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Guest-first: never blanket-401 APIs.
 * Session cookie refresh only; Commit/peers/vault use per-route guards.
 */
export async function enforceAuthRequired(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse | null> {
  // Refresh auth cookies on API traffic without blocking guests.
  if (
    isSupabaseConfigured() &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    await readAuthUser(request, response);
  }
  return null;
}

/** Server-side guard for protected page routes (SSR/data) — legacy soft check. */
export function shouldDenyProtectedPage(pathname: string, hasUser: boolean) {
  if (!isAuthRequired() || hasUser) {
    return false;
  }
  return isProtectedRoute(pathname);
}
