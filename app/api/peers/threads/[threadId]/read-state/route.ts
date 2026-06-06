import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { readPeerLastReadAt } from "@/lib/peer-chat/peer-read-receipt";
import { resolvePeerThreadIdForSend } from "@/lib/peer-chat/resolve-canonical-peer-thread";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ peerLastReadAt: null });
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
    const resolvedThreadId = await resolvePeerThreadIdForSend(supabase, {
      userId,
      threadId: decoded,
    });
    const peerLastReadAt = await readPeerLastReadAt(supabase, {
      userId,
      threadId: resolvedThreadId,
    });

    return NextResponse.json({ peerLastReadAt });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load read state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
