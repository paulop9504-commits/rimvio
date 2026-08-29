import { type NextRequest } from "next/server";
import { finishHubOAuthCallback } from "@/lib/hub/dev/hub-oauth-callback-handler";

/** Supabase Management OAuth callback. */
export async function GET(request: NextRequest) {
  return finishHubOAuthCallback(request, "supabase");
}
