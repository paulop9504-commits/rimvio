import { NextResponse, type NextRequest } from "next/server";
import { AUTH_NEXT_COOKIE, resolveAppOrigin } from "@/lib/auth/redirect-url";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resolvePostLoginPathAfterAuth } from "@/lib/onboarding/resolve-post-login-path";
import { syncUserProfileFromAuth } from "@/lib/peer-chat/server-peer-chat";
import { createClientForRoute } from "@/lib/supabase/route-handler";

function authErrorRedirect(origin: string, code: string) {
  const url = new URL("/feed", origin);
  url.searchParams.set("auth", code);
  return NextResponse.redirect(url);
}

function resolvePostLoginPath(
  request: NextRequest,
  fallback = "/peers",
) {
  const fromQuery = request.nextUrl.searchParams.get("next");
  if (fromQuery?.startsWith("/")) {
    return fromQuery;
  }

  const rawCookie = request.cookies.get(AUTH_NEXT_COOKIE)?.value;
  if (rawCookie) {
    try {
      const decoded = decodeURIComponent(rawCookie);
      if (decoded.startsWith("/")) {
        return decoded;
      }
    } catch {
      // ignore malformed cookie
    }
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  const origin = resolveAppOrigin(request);

  if (!isSupabaseConfigured()) {
    return authErrorRedirect(origin, "error");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return authErrorRedirect(origin, "missing_code");
  }

  const requestedNext = resolvePostLoginPath(request);
  let response = NextResponse.redirect(new URL(requestedNext, origin));

  const supabase = createClientForRoute(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message);
    return authErrorRedirect(origin, "error");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let needsSetup = false;

  if (user?.id) {
    try {
      const profile = await syncUserProfileFromAuth(supabase, {
        userId: user.id,
        email: user.email,
        displayName:
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split("@")[0] ||
          null,
      });
      needsSetup =
        !profile?.rimvio_id?.trim() || !profile?.display_name?.trim();
    } catch (profileError) {
      console.error("[auth/callback] profile sync", profileError);
      needsSetup = true;
    }
  }

  const postLoginPath = resolvePostLoginPathAfterAuth({
    requestedNext: requestedNext,
    needsProfileSetup: needsSetup,
  });

  // Keep the same NextResponse so Supabase session cookies are not dropped.
  if (postLoginPath !== requestedNext) {
    response.headers.set("Location", new URL(postLoginPath, origin).toString());
  }

  response.cookies.delete(AUTH_NEXT_COOKIE);
  return response;
}
