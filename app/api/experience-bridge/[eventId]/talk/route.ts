import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { ensureBridgeContextTalk } from "@/lib/experience-bridge/ensure-bridge-context-talk";
import { toBridgeStateWire } from "@/lib/experience-bridge/wire-bridge-response-dto";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ eventId: string }> };

type TalkPostBody = {
  primaryEvent?: EventCandidate;
  talkTitle?: string;
  hostDisplayName?: string;
};

function isEventCandidate(value: unknown): value is EventCandidate {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<EventCandidate>;
  return typeof row.id === "string" && typeof row.title === "string";
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: TalkPostBody = {};
  try {
    body = (await request.json()) as TalkPostBody;
  } catch {
    body = {};
  }

  if (body.primaryEvent && !isEventCandidate(body.primaryEvent)) {
    return NextResponse.json({ error: "Invalid primaryEvent." }, { status: 400 });
  }
  if (body.primaryEvent && body.primaryEvent.id !== key) {
    return NextResponse.json(
      { error: "primaryEvent id must match route eventId." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const result = await ensureBridgeContextTalk(supabase, {
      eventId: key,
      userId,
      hostDisplayName: body.hostDisplayName?.trim() || auth.user?.email?.split("@")[0] || "나",
      talkTitle: body.talkTitle,
      primaryEvent: body.primaryEvent,
    });

    return NextResponse.json({
      threadId: result.threadId,
      createdThread: result.createdThread,
      state: toBridgeStateWire(result.state),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to ensure bridge talk.");
    const status =
      message.includes("forbidden") || message.includes("Forbidden")
        ? 403
        : message.includes("bridge_bootstrap_required")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
