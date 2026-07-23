import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function unauthorizedResponse(message = "login_required") {
  return NextResponse.json(
    { error: message, authRequired: true },
    { status: 401 },
  );
}

export function authMisconfiguredResponse() {
  return NextResponse.json(
    {
      error: "Authentication is required but Supabase is not configured.",
      authRequired: true,
    },
    { status: 503 },
  );
}

/**
 * Hard identity gate for peers / cloud / commit-adjacent APIs.
 * Always requires a signed-in user when Supabase is configured
 * (independent of legacy isAuthRequired full-app wall).
 */
export async function requireAuthUser(): Promise<
  { user: User } | { response: NextResponse }
> {
  if (!isSupabaseConfigured()) {
    return { response: authMisconfiguredResponse() };
  }

  const user = await getAuthUser();
  if (!user) {
    return { response: unauthorizedResponse() };
  }

  return { user };
}

export async function getAuthUserIdRequired(): Promise<string | null> {
  const result = await requireAuthUser();
  if ("response" in result) {
    return null;
  }
  return result.user.id;
}
