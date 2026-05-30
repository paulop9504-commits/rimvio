import { NextResponse, type NextRequest } from "next/server";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = resolveAppOrigin();

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/welcome?auth=error`);
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/welcome?auth=missing_code`);
  }

  const next = request.nextUrl.searchParams.get("next") ?? "/";

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message);
    return NextResponse.redirect(`${origin}/welcome?auth=error`);
  }

  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
