/**
 * Hub Dev — Stripe Connect OAuth (dev mock + redirect stub).
 * Production: replace mock with Stripe Connect OAuth URL.
 */

import { setHubDevConnection } from "@/lib/hub/dev/hub-connection-store";

export type HubStripeConnectResult =
  | { readonly ok: true; readonly mode: "mock" }
  | { readonly ok: true; readonly mode: "redirect"; readonly url: string }
  | { readonly ok: false; readonly error: string };

export type HubStripeConnectOptions = {
  readonly returnPath?: string;
  readonly platformId?: string | null;
};

const STRIPE_CONNECT_BASE = "https://connect.stripe.com/oauth/authorize";

function buildStripeOAuthUrl(returnPath: string, platformId: string | null): string | null {
  const clientId =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID
      : undefined;
  if (!clientId) return null;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://rimvio.com";
  const redirectUri = `${origin}/api/hub/dev/stripe-connect/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: redirectUri,
    state: JSON.stringify({ returnPath, platformId }),
  });
  return `${STRIPE_CONNECT_BASE}?${params.toString()}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Start Stripe Connect — mock in dev, redirect when client id is configured. */
export async function connectHubStripe(
  options: HubStripeConnectOptions = {},
): Promise<HubStripeConnectResult> {
  const returnPath = options.returnPath ?? "/hub/workspace?stripe_connected=1";
  const oauthUrl = buildStripeOAuthUrl(returnPath, options.platformId ?? null);

  if (oauthUrl && typeof window !== "undefined") {
    window.location.assign(oauthUrl);
    return { ok: true, mode: "redirect", url: oauthUrl };
  }

  await sleep(700);
  setHubDevConnection("stripe", true);
  return { ok: true, mode: "mock" };
}

/** Complete OAuth callback (API route or mock). */
export function completeHubStripeConnect(): void {
  setHubDevConnection("stripe", true);
}
