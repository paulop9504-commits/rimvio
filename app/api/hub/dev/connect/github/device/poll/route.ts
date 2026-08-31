import { NextResponse, type NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { upsertHubConnectionForUser } from "@/lib/hub/dev/hub-connection-server-store";
import {
  fetchGitHubAccountProfile,
  pollGitHubDeviceFlow,
} from "@/lib/hub/dev/github-device-oauth";
import {
  decodeHubGitHubDeviceState,
  HUB_GITHUB_DEVICE_COOKIE_NAME,
  readHubGitHubDeviceCookie,
} from "@/lib/hub/dev/hub-github-device-state";
import { readHubOAuthCredentials } from "@/lib/hub/dev/hub-platform-oauth-server";
import { tryCreateClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const creds = readHubOAuthCredentials("github");
  if (!creds) {
    return NextResponse.json({ error: "oauth_not_configured" }, { status: 503 });
  }

  const cookieState = readHubGitHubDeviceCookie(request);
  if (!cookieState) {
    return NextResponse.json({ error: "device_session_missing" }, { status: 400 });
  }

  const state = decodeHubGitHubDeviceState(cookieState);
  if (!state || state.userId !== userId) {
    return NextResponse.json({ error: "device_session_expired" }, { status: 400 });
  }

  try {
    const polled = await pollGitHubDeviceFlow({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      deviceCode: state.deviceCode,
    });

    if (polled.status === "pending") {
      return NextResponse.json({ status: "pending", interval: state.interval });
    }
    if (polled.status === "slow_down") {
      return NextResponse.json({ status: "pending", interval: polled.interval });
    }
    if (polled.status === "expired") {
      const response = NextResponse.json({ status: "expired" }, { status: 410 });
      response.cookies.set(HUB_GITHUB_DEVICE_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return response;
    }
    if (polled.status === "denied") {
      const response = NextResponse.json({ status: "denied" }, { status: 403 });
      response.cookies.set(HUB_GITHUB_DEVICE_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return response;
    }

    const supabase = await tryCreateClient();
    if (!supabase) {
      return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
    }

    const profile = await fetchGitHubAccountProfile(polled.accessToken);
    await upsertHubConnectionForUser(supabase, {
      userId,
      provider: "github",
      secret: {
        access_token: polled.accessToken,
        refresh_token: polled.refreshToken,
      },
      label: profile.accountLabel,
      avatarUrl: profile.avatarUrl,
    });

    const response = NextResponse.json({
      status: "connected",
      accountLabel: profile.accountLabel,
      avatarUrl: profile.avatarUrl ?? null,
    });
    response.cookies.set(HUB_GITHUB_DEVICE_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[hub/github/device/poll]", error);
    const message = error instanceof Error ? error.message : "device_poll_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
