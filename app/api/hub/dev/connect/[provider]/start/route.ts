import { NextResponse, type NextRequest } from "next/server";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { getAuthUserId } from "@/lib/auth/session";
import {
  encodeHubOAuthState,
  hubOAuthStateCookieOptions,
} from "@/lib/hub/dev/hub-oauth-state";
import {
  buildHubOAuthAuthorizeUrl,
  isHubOAuthConfigured,
} from "@/lib/hub/dev/hub-platform-oauth-server";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";

const VALID_PROVIDERS: readonly HubPlatformProviderId[] = [
  "github",
  "vercel",
  "supabase",
  "stripe",
];

type RouteContext = {
  params: Promise<{ provider: string }>;
};

function isHubProvider(value: string): value is HubPlatformProviderId {
  return (VALID_PROVIDERS as readonly string[]).includes(value);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { provider: raw } = await context.params;

  if (!isHubProvider(raw)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  const provider = raw as HubPlatformProviderId;
  const origin = resolveAppOrigin(request);

  if (!isHubOAuthConfigured(provider)) {
    const returnPath = request.nextUrl.searchParams.get("returnPath") ?? "/hub/workspace";
    return NextResponse.redirect(
      new URL(
        `${returnPath}${returnPath.includes("?") ? "&" : "?"}connect_error=oauth_not_configured&provider=${provider}`,
        origin,
      ),
    );
  }

  const userId = await getAuthUserId();
  const returnPath = request.nextUrl.searchParams.get("returnPath") ?? "/hub/workspace";
  const platformId = request.nextUrl.searchParams.get("platform");

  if (!userId) {
    const next = encodeURIComponent(returnPath);
    return NextResponse.redirect(
      new URL(`/hub/workspace?login_required=1&next=${next}&connect=${provider}`, origin),
    );
  }

  const state = encodeHubOAuthState({
    provider,
    returnPath: returnPath.startsWith("/") ? returnPath : "/hub/workspace",
    userId,
    platformId,
  });

  const authorizeUrl = buildHubOAuthAuthorizeUrl(provider, state, origin);
  if (!authorizeUrl) {
    return NextResponse.json({ error: "Could not build authorize URL." }, { status: 500 });
  }

  const response = NextResponse.redirect(authorizeUrl);
  const cookie = hubOAuthStateCookieOptions(state);
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });

  return response;
}
