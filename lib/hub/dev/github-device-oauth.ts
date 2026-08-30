/**
 * GitHub OAuth Device Authorization Flow — Cursor-style code entry at github.com/login/device.
 */

export type GitHubDeviceStartResult = {
  readonly device_code: string;
  readonly user_code: string;
  readonly verification_uri: string;
  readonly expires_in: number;
  readonly interval: number;
};

export type GitHubDevicePollResult =
  | { readonly status: "pending"; readonly interval?: number }
  | { readonly status: "slow_down"; readonly interval: number }
  | { readonly status: "expired" }
  | { readonly status: "denied" }
  | {
      readonly status: "connected";
      readonly accessToken: string;
      readonly refreshToken?: string;
      readonly scope?: string;
    };

export async function startGitHubDeviceFlow(
  clientId: string,
  scope: string,
): Promise<GitHubDeviceStartResult> {
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      scope,
    }).toString(),
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(json.error_description ?? json.error ?? "device_start_failed"));
  }

  const deviceCode = String(json.device_code ?? "");
  const userCode = String(json.user_code ?? "");
  if (!deviceCode || !userCode) {
    throw new Error("device_start_invalid_response");
  }

  return {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: String(json.verification_uri ?? "https://github.com/login/device"),
    expires_in: Number(json.expires_in ?? 900),
    interval: Math.max(5, Number(json.interval ?? 5)),
  };
}

export async function pollGitHubDeviceFlow(input: {
  clientId: string;
  clientSecret: string;
  deviceCode: string;
}): Promise<GitHubDevicePollResult> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    device_code: input.deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });
  if (input.clientSecret) {
    body.set("client_secret", input.clientSecret);
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await res.json()) as Record<string, unknown>;
  const error = String(json.error ?? "");

  if (error === "authorization_pending") {
    return { status: "pending" };
  }
  if (error === "slow_down") {
    return { status: "slow_down", interval: 10 };
  }
  if (error === "expired_token") {
    return { status: "expired" };
  }
  if (error === "access_denied") {
    return { status: "denied" };
  }

  const accessToken = String(json.access_token ?? "");
  if (!accessToken) {
    throw new Error(String(json.error_description ?? (error || "device_poll_failed")));
  }

  return {
    status: "connected",
    accessToken,
    refreshToken: json.refresh_token ? String(json.refresh_token) : undefined,
    scope: json.scope ? String(json.scope) : undefined,
  };
}

export async function fetchGitHubAccountProfile(accessToken: string): Promise<{
  accountLabel: string;
  avatarUrl?: string;
}> {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!userRes.ok) {
    return { accountLabel: "GitHub" };
  }
  const user = (await userRes.json()) as { login?: string; avatar_url?: string };
  return {
    accountLabel: user.login ? `@${user.login}` : "GitHub",
    avatarUrl: user.avatar_url,
  };
}
