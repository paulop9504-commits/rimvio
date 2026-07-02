import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AgentNegotiationSlotKey } from "@/lib/globe/market/coordination/agent-negotiation-types";
import type { AgentCoordinationPatchAction } from "@/lib/globe/market/coordination/client/fetch-agent-coordination-client";
import {
  approveAgentCoordinationRoomForUser,
  getAgentCoordinationRoomForUser,
  startAgentCoordinationRoomForUser,
  submitAgentCoordinationSlotForUser,
  syncAgentCoordinationFocusForUser,
  tickAgentCoordinationRoomForUser,
} from "@/lib/globe/market/coordination/server/agent-coordination-room-server";
import type { StartAgentNegotiationRoomInput } from "@/lib/globe/market/coordination/agent-negotiation-types";
import { parseCalendarBusyIntervalWire } from "@/lib/globe/market/coordination/coordination-calendar-busy";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

type RouteContext = {
  params: Promise<{ handshakeId: string }>;
};

function readAction(value: unknown): AgentCoordinationPatchAction | null {
  if (
    value === "start" ||
    value === "submit_slot" ||
    value === "approve" ||
    value === "tick" ||
    value === "focus_sync"
  ) {
    return value;
  }
  return null;
}

function readViewerRole(value: unknown): MarketIntentRole {
  return value === "listing" ? "listing" : "seeking";
}

function readStartInput(
  handshakeId: string,
  start: Record<string, unknown> | undefined,
): StartAgentNegotiationRoomInput {
  const busy = parseCalendarBusyIntervalWire(start?.calendarBusyIntervals);
  return {
    handshakeId,
    threadId: typeof start?.threadId === "string" ? start.threadId : null,
    productTitle: typeof start?.productTitle === "string" ? start.productTitle : "",
    priceLine: typeof start?.priceLine === "string" ? start.priceLine : "",
    peerDisplayName:
      typeof start?.peerDisplayName === "string" ? start.peerDisplayName : "상대",
    viewerRole: readViewerRole(start?.viewerRole),
    availabilityPreset:
      typeof start?.availabilityPreset === "string"
        ? (start.availabilityPreset as StartAgentNegotiationRoomInput["availabilityPreset"])
        : undefined,
    priceMinKrw:
      typeof start?.priceMinKrw === "number" ? start.priceMinKrw : undefined,
    priceMaxKrw:
      typeof start?.priceMaxKrw === "number" ? start.priceMaxKrw : undefined,
    calendarBusyIntervals: busy.length > 0 ? busy : undefined,
  };
}

function readPatchContext(row: Record<string, unknown>) {
  return {
    calendarBusyIntervals: row.calendarBusyIntervals,
    focusActive: row.focusActive === true,
    focusDeferMessageKo:
      typeof row.focusDeferMessageKo === "string"
        ? row.focusDeferMessageKo.trim()
        : undefined,
  };
}

function readSlotKey(value: unknown): AgentNegotiationSlotKey | null {
  if (
    value === "min_price_krw" ||
    value === "max_price_krw" ||
    value === "meet_time_label"
  ) {
    return value;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { handshakeId } = await context.params;
  const id = handshakeId.trim();
  if (!id) {
    return NextResponse.json({ error: "handshake_required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ room: null, migrationPending: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const room = await getAgentCoordinationRoomForUser(supabase, user.id, id);
    if (!room) {
      return NextResponse.json({ room: null }, { status: 404 });
    }
    return NextResponse.json({ ok: true, room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "coordination_read_failed";
    if (
      message.includes("market_agent_coordination_rooms") ||
      message.includes("does not exist")
    ) {
      return NextResponse.json({ room: null, migrationPending: true }, { status: 404 });
    }
    if (message === "handshake_not_found" || message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { handshakeId } = await context.params;
  const id = handshakeId.trim();
  if (!id) {
    return NextResponse.json({ error: "handshake_required" }, { status: 400 });
  }

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

  const row = body as Record<string, unknown>;
  const action = readAction(row.action);
  if (!action) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  try {
    let room;
    if (action === "start") {
      const start = row.start as Record<string, unknown> | undefined;
      const context = readPatchContext(row);
      room = await startAgentCoordinationRoomForUser(
        supabase,
        user.id,
        readStartInput(id, start),
        context,
      );
    } else if (action === "submit_slot") {
      const slotKey = readSlotKey(row.slotKey);
      const valueKo = typeof row.valueKo === "string" ? row.valueKo.trim() : "";
      if (!slotKey || !valueKo) {
        return NextResponse.json({ error: "slot_required" }, { status: 400 });
      }
      room = await submitAgentCoordinationSlotForUser(
        supabase,
        user.id,
        id,
        slotKey,
        valueKo,
      );
    } else if (action === "approve") {
      room = await approveAgentCoordinationRoomForUser(supabase, user.id, id);
    } else if (action === "focus_sync") {
      const context = readPatchContext(row);
      if (!context.focusDeferMessageKo) {
        return NextResponse.json({ error: "focus_message_required" }, { status: 400 });
      }
      room = await syncAgentCoordinationFocusForUser(supabase, user.id, id, {
        focusActive: context.focusActive === true,
        focusDeferMessageKo: context.focusDeferMessageKo,
        calendarBusyIntervals: context.calendarBusyIntervals,
      });
    } else {
      const context = readPatchContext(row);
      room = await tickAgentCoordinationRoomForUser(supabase, user.id, id, context);
    }
    return NextResponse.json({ ok: true, room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "coordination_patch_failed";
    if (
      message.includes("market_agent_coordination_rooms") ||
      message.includes("does not exist")
    ) {
      return NextResponse.json({ error: "migration_pending" }, { status: 503 });
    }
    const status =
      message === "forbidden" || message === "slot_owner_only"
        ? 403
        : message === "coordination_not_found" || message === "slot_not_pending"
          ? 400
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
