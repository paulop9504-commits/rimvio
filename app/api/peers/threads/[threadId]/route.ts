import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { peerApiErrorResponse } from "@/lib/peer-chat/peer-api-errors";
import {
  ensurePeerThread,
  readPeerThread,
} from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const decoded = decodeURIComponent(threadId);

  try {
    const supabase = await createClient();
    let thread = await readPeerThread(supabase, decoded);

    if (!thread) {
      const ensured = await ensurePeerThread(supabase, {
        threadId: decoded,
        displayName: "친구",
        userId,
      });
      thread = ensured.thread;
    }

    return NextResponse.json({
      threadId: thread.id,
      inviteCode: thread.invite_code,
      displayName: thread.display_name,
    });
  } catch (error) {
    return peerApiErrorResponse(error, "대화방을 열 수 없어요.");
  }
}
