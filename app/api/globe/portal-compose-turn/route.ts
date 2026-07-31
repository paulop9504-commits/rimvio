import { NextResponse } from "next/server";
import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import {
  resolvePortalComposeRunTurn,
  type PortalComposeRunTurnResult,
} from "@/lib/portal/resolve-portal-compose-run-turn";
import type { PortalCategoryId, PortalIntentId } from "@/lib/portal/portal-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";
export const maxDuration = 120;

type PortalComposeTurnBody = {
  graphId?: string;
  intentId?: PortalIntentId;
  categoryId?: PortalCategoryId | null;
  message?: string;
  eventId?: string;
  liveLat?: number | null;
  liveLng?: number | null;
  resumeState?: PortalComposeRunState | null;
  answerText?: string | null;
  memoryNotesKo?: string | null;
};

function parseBody(body: PortalComposeTurnBody | null): {
  graphId: string;
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  message: string;
  eventId: string;
  liveLat: number | null;
  liveLng: number | null;
  resumeState: PortalComposeRunState | null;
  answerText: string | null;
  memoryNotesKo: string | null;
} | null {
  if (!body) {
    return null;
  }
  const graphId = body.graphId?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const eventId = body.eventId?.trim() ?? "";
  const intentId = body.intentId;
  if (!graphId || !message || !eventId || !intentId) {
    return null;
  }
  return {
    graphId,
    intentId,
    categoryId: body.categoryId ?? null,
    message,
    eventId,
    liveLat: body.liveLat ?? null,
    liveLng: body.liveLng ?? null,
    resumeState: body.resumeState ?? null,
    answerText: body.answerText?.trim() || null,
    memoryNotesKo: body.memoryNotesKo?.trim() || null,
  };
}

export async function POST(request: Request) {
  let body: PortalComposeTurnBody | null = null;
  try {
    body = (await request.json()) as PortalComposeTurnBody;
    const input = parseBody(body);
    if (!input) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const result: PortalComposeRunTurnResult = await resolvePortalComposeRunTurn(input);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[portal-compose-turn] failed", error);
    return NextResponse.json({ error: "portal_compose_turn_failed" }, { status: 500 });
  }
}
