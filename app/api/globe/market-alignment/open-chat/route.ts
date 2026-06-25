import { type NextRequest, NextResponse } from "next/server";
import { readMarketHandshakeUserError } from "@/lib/globe/market/read-market-handshake-user-error";
import { bootstrapSeekerMarketChat } from "@/lib/globe/market/server/bootstrap-seeker-market-chat";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const focusEventId =
    typeof (body as { focusEventId?: unknown }).focusEventId === "string"
      ? (body as { focusEventId: string }).focusEventId.trim()
      : "";
  const matchIntentId =
    typeof (body as { matchIntentId?: unknown }).matchIntentId === "string"
      ? (body as { matchIntentId: string }).matchIntentId.trim()
      : "";
  const seekingIntentId =
    typeof (body as { seekingIntentId?: unknown }).seekingIntentId === "string"
      ? (body as { seekingIntentId: string }).seekingIntentId.trim()
      : "";
  const initialMessage =
    typeof (body as { initialMessage?: unknown }).initialMessage === "string"
      ? (body as { initialMessage: string }).initialMessage
      : null;
  const initTradeSession = (body as { initTradeSession?: unknown }).initTradeSession === true;
  const requireTradeSession =
    (body as { requireTradeSession?: unknown }).requireTradeSession === true;

  if (!focusEventId || !matchIntentId) {
    return NextResponse.json({ error: "focus_and_match_required" }, { status: 400 });
  }

  try {
    const result = await bootstrapSeekerMarketChat(supabase, user.id, {
      focusEventId,
      seekingIntentId: seekingIntentId || undefined,
      matchIntentId,
      initialMessage,
      initTradeSession,
      requireTradeSession,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const raw = extractErrorMessage(error, "open_chat_failed");
    const message = readMarketHandshakeUserError(raw);
    return NextResponse.json({ error: raw, message }, { status: 400 });
  }
}
