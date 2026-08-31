import { type NextRequest } from "next/server";
import { finishHubOAuthCallback } from "@/lib/hub/dev/hub-oauth-callback-handler";

/** GitHub OAuth callback — exchange code, store token, redirect with profile. */
export async function GET(request: NextRequest) {
  return finishHubOAuthCallback(request, "github");
}
