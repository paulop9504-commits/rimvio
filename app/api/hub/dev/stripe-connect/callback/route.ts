import { NextResponse } from "next/server";

/**
 * Stripe Connect OAuth callback stub.
 * Exchanges code in production; dev redirect completes connect state client-side.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const stateRaw = url.searchParams.get("state");
  let returnPath = "/hub/workspace?stripe_connected=1";

  if (stateRaw) {
    try {
      const state = JSON.parse(stateRaw) as { returnPath?: string };
      if (state.returnPath) returnPath = state.returnPath;
    } catch {
      /* ignore malformed state */
    }
  }

  const separator = returnPath.includes("?") ? "&" : "?";
  const redirectTo = `${returnPath}${separator}stripe_connected=1`;
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
