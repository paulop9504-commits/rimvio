import { type NextRequest, NextResponse } from "next/server";
import { copy } from "@/lib/copy/human-ko";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  buildDmThreadId,
  ensurePeerThread,
  insertPeerMessage,
} from "@/lib/peer-chat/server-peer-chat";
import {
  findMarketIntentById,
  listOwnMarketIntents,
} from "@/lib/globe/market/server/upsert-market-intent";

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

  const matchIntentId =
    typeof (body as { matchIntentId?: unknown }).matchIntentId === "string"
      ? (body as { matchIntentId: string }).matchIntentId.trim()
      : "";
  if (!matchIntentId) {
    return NextResponse.json({ error: "match_intent_required" }, { status: 400 });
  }

  const matchIntent = await findMarketIntentById(supabase, matchIntentId);
  if (!matchIntent?.active || !matchIntent.userId) {
    return NextResponse.json({ error: "match_not_found" }, { status: 404 });
  }
  if (matchIntent.userId === user.id) {
    return NextResponse.json({ error: "self_match" }, { status: 400 });
  }

  const own = await listOwnMarketIntents(supabase, user.id);
  if (own.length === 0) {
    return NextResponse.json({ error: "own_intent_required" }, { status: 400 });
  }

  const threadId = buildDmThreadId(user.id, matchIntent.userId);
  const displayName =
    matchIntent.title.trim().slice(0, 48) ||
    copy.globe.marketAlignBridgeThreadLabel;

  try {
    const { thread, created } = await ensurePeerThread(supabase, {
      threadId,
      displayName,
      userId: user.id,
    });

    if (created) {
      await insertPeerMessage(supabase, {
        threadId: thread.id,
        senderUserId: user.id,
        body: copy.globe.marketAlignBridgeSeedMessage(
          matchIntent.title,
          matchIntent.placeLabel || "근처",
        ),
      });
    }

    return NextResponse.json({
      ok: true,
      threadId: thread.id,
      createdThread: created,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "bridge_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
