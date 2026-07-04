import { NextResponse } from "next/server";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveMediaGuideNodesForEvent } from "@/lib/ontology/media-guide-enrichment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEventCandidateLike(value: unknown): value is EventCandidate {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<EventCandidate>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.category === "string" &&
    typeof row.source === "string" &&
    typeof row.lifecycle === "string"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const event = (body as { event?: unknown } | null)?.event;
  if (!isEventCandidateLike(event)) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const guides = await resolveMediaGuideNodesForEvent(event);
  return NextResponse.json({ ok: true, guides });
}
