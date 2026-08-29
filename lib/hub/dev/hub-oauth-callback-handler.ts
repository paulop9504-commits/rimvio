import { NextResponse, type NextRequest } from "next/server";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { getAuthUser, getAuthUserId } from "@/lib/auth/session";
import { upsertHubConnectionForUser } from "@/lib/hub/dev/hub-connection-server-store";
import {
  decodeHubOAuthState,
  HUB_OAUTH_STATE_COOKIE_NAME,
  readHubOAuthStateCookie,
} from "@/lib/hub/dev/hub-oauth-state";
import {
  exchangeHubOAuthCode,
  HUB_OAUTH_CONFIG,
  resolveHubOAuthOrigin,
} from "@/lib/hub/dev/hub-platform-oauth-server";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import { tryCreateClient } from "@/lib/supabase/server";

function accountParamForProvider(provider: HubPlatformProviderId): string {
  return `${provider}_account`;
}

function avatarParamForProvider(provider: HubPlatformProviderId): string | null {
  return provider === "github" ? "github_avatar" : null;
}

export async function finishHubOAuthCallback(
  request: NextRequest,
  provider: HubPlatformProviderId,
): Promise<NextResponse> {
  const origin = resolveHubOAuthOrigin(request);
  const cfg = HUB_OAUTH_CONFIG[provider];
  const connectedParam = cfg?.connectedParam ?? `${provider}_connected`;
  const fallbackReturn = `/hub/workspace?${connectedParam}=1`;

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      new URL(`${fallbackReturn}&connect_error=${encodeURIComponent(oauthError)}`, origin),
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  if (!code || !stateParam) {
    return NextResponse.redirect(new URL(`${fallbackReturn}&connect_error=missing_code`, origin));
  }

  const cookieState = readHubOAuthStateCookie(request);
  if (!cookieState || cookieState !== stateParam) {
    return NextResponse.redirect(new URL(`${fallbackReturn}&connect_error=invalid_state`, origin));
  }

  const state = decodeHubOAuthState(stateParam);
  if (!state || state.provider !== provider) {
    return NextResponse.redirect(new URL(`${fallbackReturn}&connect_error=expired_state`, origin));
  }

  const userId = await getAuthUserId();
  if (!userId || userId !== state.userId) {
    return NextResponse.redirect(new URL(`${fallbackReturn}&connect_error=login_required`, origin));
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL(`${fallbackReturn}&connect_error=storage_unavailable`, origin),
    );
  }

  try {
    const exchanged = await exchangeHubOAuthCode(provider, code, origin);
    await upsertHubConnectionForUser(supabase, {
      userId,
      provider,
      secret: exchanged,
      label: exchanged.accountLabel,
      avatarUrl: exchanged.avatarUrl,
    });

    const returnPath = state.returnPath || fallbackReturn;
    const separator = returnPath.includes("?") ? "&" : "?";
    const params = new URLSearchParams();
    params.set(connectedParam, "1");
    params.set(accountParamForProvider(provider), exchanged.accountLabel.replace(/^@/, ""));
    const avatarParam = avatarParamForProvider(provider);
    if (avatarParam && exchanged.avatarUrl) {
      params.set(avatarParam, exchanged.avatarUrl);
    }

    const redirectTo = `${returnPath}${separator}${params.toString()}`;
    const response = NextResponse.redirect(new URL(redirectTo, origin));
    response.cookies.set(HUB_OAUTH_STATE_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error(`[hub/oauth/callback/${provider}]`, error);
    const reason = error instanceof Error ? error.message : "oauth_failed";
    return NextResponse.redirect(
      new URL(`${fallbackReturn}&connect_error=${encodeURIComponent(reason)}`, origin),
    );
  }
}

export async function hubConnectionsJsonResponse(request?: NextRequest) {
  const user = await getAuthUser();
  const origin = request ? resolveAppOrigin(request) : resolveAppOrigin();

  if (!user) {
    return NextResponse.json({
      signedIn: false,
      user: null,
      connections: [],
      oauthConfigured: {},
    });
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }

  const { listHubConnectionsForUser } = await import("@/lib/hub/dev/hub-connection-server-store");
  const { hubOAuthConfiguredSummary } = await import("@/lib/hub/dev/hub-platform-oauth-server");
  const connections = await listHubConnectionsForUser(supabase, user.id);

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl =
    (typeof metadata?.avatar_url === "string" ? metadata.avatar_url : null) ??
    (typeof metadata?.picture === "string" ? metadata.picture : null);

  return NextResponse.json({
    signedIn: true,
    user: {
      id: user.id,
      email: user.email ?? null,
      name:
        (typeof metadata?.full_name === "string" ? metadata.full_name : null) ??
        (typeof metadata?.name === "string" ? metadata.name : null) ??
        user.email ??
        "User",
      avatarUrl,
    },
    connections,
    oauthConfigured: hubOAuthConfiguredSummary(),
    origin,
  });
}
