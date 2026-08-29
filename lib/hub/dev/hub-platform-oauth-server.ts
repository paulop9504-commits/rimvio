/**
 * Hub Platform OAuth — server-side token exchange + live verification.
 */

import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import type { IntegrationSecretPayload } from "@/lib/integrations/types";

export type HubOAuthServerConfig = {
  readonly provider: HubPlatformProviderId;
  readonly authorizeUrl: string;
  readonly tokenUrl: string;
  readonly clientIdEnv: string;
  readonly clientSecretEnv: string;
  readonly callbackPath: string;
  readonly scope: string;
  readonly connectedParam: string;
  readonly extraAuthorizeParams?: Record<string, string>;
};

export const HUB_OAUTH_CONFIG: Partial<Record<HubPlatformProviderId, HubOAuthServerConfig>> = {
  github: {
    provider: "github",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    clientIdEnv: "NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID",
    clientSecretEnv: "GITHUB_OAUTH_CLIENT_SECRET",
    callbackPath: "/api/hub/dev/github-connect/callback",
    scope: "repo read:user",
    connectedParam: "github_connected",
  },
  stripe: {
    provider: "stripe",
    authorizeUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl: "https://connect.stripe.com/oauth/token",
    clientIdEnv: "NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID",
    clientSecretEnv: "STRIPE_CONNECT_CLIENT_SECRET",
    callbackPath: "/api/hub/dev/stripe-connect/callback",
    scope: "read_write",
    connectedParam: "stripe_connected",
    extraAuthorizeParams: { response_type: "code" },
  },
  vercel: {
    provider: "vercel",
    authorizeUrl: "https://vercel.com/integrations/rimvio/new",
    tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
    clientIdEnv: "NEXT_PUBLIC_VERCEL_INTEGRATION_ID",
    clientSecretEnv: "VERCEL_INTEGRATION_CLIENT_SECRET",
    callbackPath: "/api/hub/dev/vercel-connect/callback",
    scope: "deployments",
    connectedParam: "vercel_connected",
  },
  supabase: {
    provider: "supabase",
    authorizeUrl: "https://api.supabase.com/v1/oauth/authorize",
    tokenUrl: "https://api.supabase.com/v1/oauth/token",
    clientIdEnv: "NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID",
    clientSecretEnv: "SUPABASE_OAUTH_CLIENT_SECRET",
    callbackPath: "/api/hub/dev/supabase-connect/callback",
    scope: "projects:read organizations:read",
    connectedParam: "supabase_connected",
    extraAuthorizeParams: { response_type: "code" },
  },
};

export function hubOAuthCallbackUrl(origin: string, provider: HubPlatformProviderId): string {
  const cfg = HUB_OAUTH_CONFIG[provider];
  if (!cfg) throw new Error(`Unknown hub provider: ${provider}`);
  return `${origin.replace(/\/$/, "")}${cfg.callbackPath}`;
}

export function readHubOAuthCredentials(
  provider: HubPlatformProviderId,
): { clientId: string; clientSecret: string } | null {
  const cfg = HUB_OAUTH_CONFIG[provider];
  if (!cfg) return null;
  const clientId = process.env[cfg.clientIdEnv]?.trim();
  const clientSecret = process.env[cfg.clientSecretEnv]?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isHubOAuthConfigured(provider: HubPlatformProviderId): boolean {
  return readHubOAuthCredentials(provider) !== null;
}

export function buildHubOAuthAuthorizeUrl(
  provider: HubPlatformProviderId,
  state: string,
  origin: string,
): string | null {
  const cfg = HUB_OAUTH_CONFIG[provider];
  const creds = readHubOAuthCredentials(provider);
  if (!cfg || !creds) return null;

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: hubOAuthCallbackUrl(origin, provider),
    state,
  });

  if (provider === "stripe") {
    params.set("response_type", "code");
    params.set("scope", cfg.scope);
  } else if (provider === "github") {
    params.set("scope", cfg.scope);
  } else if (provider === "supabase") {
    params.set("response_type", "code");
    params.set("scope", cfg.scope);
  } else {
    params.set("scope", cfg.scope);
  }

  for (const [key, value] of Object.entries(cfg.extraAuthorizeParams ?? {})) {
    params.set(key, value);
  }

  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export type HubOAuthExchangeResult = IntegrationSecretPayload & {
  readonly accountLabel: string;
  readonly avatarUrl?: string;
};

export async function exchangeHubOAuthCode(
  provider: HubPlatformProviderId,
  code: string,
  origin: string,
): Promise<HubOAuthExchangeResult> {
  const cfg = HUB_OAUTH_CONFIG[provider];
  const creds = readHubOAuthCredentials(provider);
  if (!cfg || !creds) {
    throw new Error(`OAuth not configured for ${provider}`);
  }

  const redirectUri = hubOAuthCallbackUrl(origin, provider);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const tokenJson = (await tokenRes.json()) as Record<string, unknown>;
  const accessToken = String(tokenJson.access_token ?? "");
  if (!accessToken) {
    throw new Error(String(tokenJson.error_description ?? tokenJson.error ?? "token_exchange_failed"));
  }

  const secret: IntegrationSecretPayload = {
    access_token: accessToken,
    refresh_token: tokenJson.refresh_token ? String(tokenJson.refresh_token) : undefined,
  };

  return enrichHubAccountProfile(provider, secret, tokenJson);
}

async function enrichHubAccountProfile(
  provider: HubPlatformProviderId,
  secret: IntegrationSecretPayload,
  tokenJson: Record<string, unknown>,
): Promise<HubOAuthExchangeResult> {
  const token = secret.access_token!;

  switch (provider) {
    case "github": {
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });
      if (!userRes.ok) {
        return { ...secret, accountLabel: "GitHub" };
      }
      const user = (await userRes.json()) as { login?: string; avatar_url?: string };
      return {
        ...secret,
        accountLabel: user.login ? `@${user.login}` : "GitHub",
        avatarUrl: user.avatar_url,
      };
    }
    case "stripe": {
      const accountId = String(tokenJson.stripe_user_id ?? "");
      return {
        ...secret,
        accountLabel: accountId ? `acct_${accountId.slice(-8)}` : "Stripe Connect",
      };
    }
    case "vercel": {
      const userRes = await fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userRes.ok) {
        return { ...secret, accountLabel: "Vercel" };
      }
      const user = (await userRes.json()) as { user?: { username?: string } };
      return {
        ...secret,
        accountLabel: user.user?.username ?? "Vercel",
      };
    }
    case "supabase": {
      const orgRes = await fetch("https://api.supabase.com/v1/organizations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!orgRes.ok) {
        return { ...secret, accountLabel: "Supabase" };
      }
      const orgs = (await orgRes.json()) as Array<{ name?: string }>;
      return {
        ...secret,
        accountLabel: orgs[0]?.name ?? "Supabase",
      };
    }
    default:
      return { ...secret, accountLabel: provider };
  }
}

export async function verifyHubOAuthLive(
  provider: HubPlatformProviderId,
  secret: IntegrationSecretPayload,
): Promise<boolean> {
  const token = secret.access_token;
  if (!token) return false;

  try {
    switch (provider) {
      case "github": {
        const res = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        });
        return res.ok;
      }
      case "stripe": {
        const res = await fetch("https://api.stripe.com/v1/account", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.ok;
      }
      case "vercel": {
        const res = await fetch("https://api.vercel.com/v2/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.ok;
      }
      case "supabase": {
        const res = await fetch("https://api.supabase.com/v1/projects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.ok;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export function hubOAuthConfiguredSummary(): Record<HubPlatformProviderId, boolean> {
  const providers: HubPlatformProviderId[] = ["github", "vercel", "supabase", "stripe"];
  return Object.fromEntries(
    providers.map((p) => [p, isHubOAuthConfigured(p)]),
  ) as Record<HubPlatformProviderId, boolean>;
}

export function resolveHubOAuthOrigin(request?: Request): string {
  if (request) {
    return new URL(request.url).origin;
  }
  return resolveAppOrigin();
}
