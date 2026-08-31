import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { startGitHubDeviceFlow } from "@/lib/hub/dev/github-device-oauth";
import {
  encodeHubGitHubDeviceState,
  hubGitHubDeviceCookieOptions,
} from "@/lib/hub/dev/hub-github-device-state";
import {
  HUB_OAUTH_CONFIG,
  isHubOAuthConfigured,
  readHubOAuthCredentials,
} from "@/lib/hub/dev/hub-platform-oauth-server";

export async function POST() {
  if (!isHubOAuthConfigured("github")) {
    return NextResponse.json(
      { error: "oauth_not_configured", message: "GitHub OAuth env vars are missing." },
      { status: 503 },
    );
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const creds = readHubOAuthCredentials("github");
  const cfg = HUB_OAUTH_CONFIG.github;
  if (!creds || !cfg) {
    return NextResponse.json({ error: "oauth_not_configured" }, { status: 503 });
  }

  try {
    const started = await startGitHubDeviceFlow(creds.clientId, cfg.scope);
    const state = encodeHubGitHubDeviceState({
      deviceCode: started.device_code,
      userId,
      interval: started.interval,
    });

    const response = NextResponse.json({
      user_code: started.user_code,
      verification_uri: started.verification_uri,
      expires_in: started.expires_in,
      interval: started.interval,
    });

    const cookie = hubGitHubDeviceCookieOptions(state);
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });

    return response;
  } catch (error) {
    console.error("[hub/github/device/start]", error);
    const message = error instanceof Error ? error.message : "device_start_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
