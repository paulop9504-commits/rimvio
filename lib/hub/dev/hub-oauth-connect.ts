/**

 * P8 — Multi-provider OAuth connect (Stripe · GitHub · Vercel · Supabase).

 * Cursor-style: redirect when OAuth configured, dev sign-in sheet otherwise.

 */



import {

  setHubDevConnection,

  setHubConnectionProfile,

  type HubDevConnectionId,

  type HubConnectionProfile,

} from "@/lib/hub/dev/hub-connection-store";

import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";

import {

  connectActionIdForProvider,

  providerLabel,

} from "@/lib/hub/dev/hub-connect-provider";



export type HubOAuthConnectResult =
  | { readonly ok: true; readonly mode: "redirect"; readonly url: string }
  | { readonly ok: true; readonly mode: "login" }
  | { readonly ok: false; readonly error: string; readonly code?: "login_required" | "oauth_not_configured" };



export type HubOAuthConnectOptions = {

  readonly provider: HubPlatformProviderId;

  readonly returnPath?: string;

  readonly platformId?: string | null;

};



const OAUTH_CONFIG: Partial<

  Record<

    HubPlatformProviderId,

    {

      readonly authorizeUrl: string;

      readonly envClientId: string;

      readonly callbackPath: string;

      readonly scope: string;

      readonly connectedParam: string;

    }

  >

> = {

  stripe: {

    authorizeUrl: "https://connect.stripe.com/oauth/authorize",

    envClientId: "NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID",

    callbackPath: "/api/hub/dev/stripe-connect/callback",

    scope: "read_write",

    connectedParam: "stripe_connected",

  },

  github: {

    authorizeUrl: "https://github.com/login/oauth/authorize",

    envClientId: "NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID",

    callbackPath: "/api/hub/dev/github-connect/callback",

    scope: "repo read:user",

    connectedParam: "github_connected",

  },

  vercel: {

    authorizeUrl: "https://vercel.com/integrations/rimvio/new",

    envClientId: "NEXT_PUBLIC_VERCEL_INTEGRATION_ID",

    callbackPath: "/api/hub/dev/vercel-connect/callback",

    scope: "deployments",

    connectedParam: "vercel_connected",

  },

  supabase: {

    authorizeUrl: "https://api.supabase.com/v1/oauth/authorize",

    envClientId: "NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID",

    callbackPath: "/api/hub/dev/supabase-connect/callback",

    scope: "projects:read organizations:read",

    connectedParam: "supabase_connected",

  },

};



function providerToStoreId(provider: HubPlatformProviderId): HubDevConnectionId | null {

  if (

    provider === "stripe" ||

    provider === "github" ||

    provider === "vercel" ||

    provider === "supabase" ||

    provider === "openai" ||

    provider === "mcp"

  ) {

    return provider;

  }

  return null;

}



function buildOAuthUrl(options: HubOAuthConnectOptions): string | null {

  const cfg = OAUTH_CONFIG[options.provider];

  if (!cfg) return null;



  const clientId =

    typeof process !== "undefined" ? process.env[cfg.envClientId] : undefined;

  if (!clientId) return null;



  const origin =

    typeof window !== "undefined" ? window.location.origin : "https://rimvio.com";

  const redirectUri = `${origin}${cfg.callbackPath}`;

  const returnPath = options.returnPath ?? `/hub/workspace?${cfg.connectedParam}=1`;

  const params = new URLSearchParams({

    client_id: clientId,

    redirect_uri: redirectUri,

    state: JSON.stringify({

      returnPath,

      platformId: options.platformId ?? null,

      provider: options.provider,

    }),

  });



  if (options.provider === "stripe") {

    params.set("response_type", "code");

    params.set("scope", cfg.scope);

  } else if (options.provider === "github") {

    params.set("scope", cfg.scope);

  } else if (options.provider === "supabase") {

    params.set("response_type", "code");

    params.set("scope", cfg.scope);

  } else {

    params.set("scope", cfg.scope);

  }



  return `${cfg.authorizeUrl}?${params.toString()}`;

}



export function connectedParamForProvider(provider: HubPlatformProviderId): string | null {

  return OAUTH_CONFIG[provider]?.connectedParam ?? null;

}



export function resumeUtteranceForProvider(provider: HubPlatformProviderId): string {

  switch (provider) {

    case "stripe":

      return "Stripe 연결 완료 — 결제 capability 이어서 진행";

    case "github":

      return "GitHub 연결 완료 — repository 연동 이어서 진행";

    case "vercel":

      return "Vercel 연결 완료 — deploy target 이어서 진행";

    case "supabase":

      return "Supabase 연결 완료 — database 연동 이어서 진행";

    default:

      return `${providerLabel(provider)} 연결 완료 — 이어서 진행`;

  }

}



export { connectActionIdForProvider, providerLabel };



/** Complete connect with profile from live OAuth callback. */
export function completeHubOAuthConnect(
  provider: HubPlatformProviderId,
  profile?: Partial<HubConnectionProfile>,
): void {
  const storeId = providerToStoreId(provider);
  if (!storeId) return;
  setHubDevConnection(storeId, true);
  if (profile?.accountLabel) {
    setHubConnectionProfile({
      provider: storeId,
      accountLabel: profile.accountLabel,
      connectedAtIso: profile.connectedAtIso ?? new Date().toISOString(),
      avatarUrl: profile.avatarUrl,
    });
  }
}

/** @deprecated Dev mock removed — use live OAuth via connectHubOAuthProvider. */
export function completeHubOAuthConnectMock(provider: HubPlatformProviderId): void {
  completeHubOAuthConnect(provider);
}



/** Start live OAuth — requires Google login + server OAuth env. */
export async function connectHubOAuthProvider(
  options: HubOAuthConnectOptions,
): Promise<HubOAuthConnectResult> {
  const storeId = providerToStoreId(options.provider);
  if (!storeId) {
    return { ok: false, error: `Unsupported provider: ${options.provider}` };
  }

  if (typeof window === "undefined") {
    return { ok: false, error: "Client only" };
  }

  const statusRes = await fetch("/api/auth/status", { credentials: "include" });
  const status = (await statusRes.json()) as { signedIn?: boolean };
  if (!status.signedIn) {
    return { ok: true, mode: "login" };
  }

  const connectedParam = connectedParamForProvider(options.provider) ?? `${options.provider}_connected`;
  const returnPath =
    options.returnPath ??
    `/hub/workspace?${connectedParam}=1${options.platformId ? `&platform=${encodeURIComponent(options.platformId)}` : ""}`;

  const params = new URLSearchParams({ returnPath });
  if (options.platformId) params.set("platform", options.platformId);

  const startUrl = `/api/hub/dev/connect/${options.provider}/start?${params.toString()}`;
  window.location.assign(startUrl);
  return { ok: true, mode: "redirect", url: startUrl };
}



/** @deprecated use connectHubOAuthProvider */

export async function connectHubStripe(

  options: Omit<HubOAuthConnectOptions, "provider"> = {},

): Promise<HubOAuthConnectResult> {

  return connectHubOAuthProvider({ ...options, provider: "stripe" });

}



/** @deprecated use completeHubOAuthConnect */

export function completeHubStripeConnect(): void {

  completeHubOAuthConnect("stripe");

}



/** Parse profile from OAuth callback query params. */

export function parseOAuthProfileFromSearchParams(

  provider: HubPlatformProviderId,

  params: URLSearchParams,

): Partial<HubConnectionProfile> | undefined {

  const account =

    params.get(`${provider}_account`) ??

    params.get("github_account") ??

    params.get("account");

  if (!account) return undefined;

  return {

    provider: provider as HubDevConnectionId,

    accountLabel: account.startsWith("@") ? account : `@${account}`,

    connectedAtIso: new Date().toISOString(),

    avatarUrl: params.get(`${provider}_avatar`) ?? undefined,

  };

}


