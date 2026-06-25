import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { listActiveAlignmentChatsForUser } from "@/lib/globe/market/server/list-active-alignment-chats-for-user";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [] });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const items = await listActiveAlignmentChatsForUser(supabase, userId);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load alignment chats.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
