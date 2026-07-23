import type { CalendarBusyIntervalWire } from "@/lib/globe/market/coordination/coordination-calendar-busy";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import {
  isClientAuthCircuitOpen,
  noteClientAuthFailure,
} from "@/lib/http/client-auth-circuit";
import type {
  AgentNegotiationRoomRecord,
  AgentNegotiationSlotKey,
  StartAgentNegotiationRoomInput,
} from "@/lib/globe/market/coordination/agent-negotiation-types";

export type AgentCoordinationPatchAction =
  | "start"
  | "submit_slot"
  | "approve"
  | "tick"
  | "focus_sync";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    noteClientAuthFailure();
    throw new Error("unauthorized");
  }
  const body = (await response.json()) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new Error(body.error ?? body.message ?? "coordination_request_failed");
  }
  return body;
}

function assertAuthCircuitAllowsFetch(): void {
  if (isClientAuthCircuitOpen()) {
    throw new Error("auth_circuit_open");
  }
}

export async function fetchActiveAgentCoordinationRoomsRemote(): Promise<{
  rooms: AgentNegotiationRoomRecord[];
  migrationPending?: boolean;
}> {
  assertAuthCircuitAllowsFetch();
  const response = await fetch(`${resolveAppOrigin()}/api/globe/market-coordination/active`, {
    credentials: "include",
  });
  const body = await parseJsonResponse<{
    ok?: boolean;
    rooms?: AgentNegotiationRoomRecord[];
    migrationPending?: boolean;
  }>(response);
  return {
    rooms: body.rooms ?? [],
    migrationPending: body.migrationPending === true,
  };
}

export async function fetchAgentCoordinationRoomRemote(
  handshakeId: string,
): Promise<AgentNegotiationRoomRecord | null> {
  assertAuthCircuitAllowsFetch();
  const response = await fetch(
    `${resolveAppOrigin()}/api/globe/market-coordination/${encodeURIComponent(handshakeId)}`,
    { credentials: "include" },
  );
  if (response.status === 401) {
    noteClientAuthFailure();
    throw new Error("unauthorized");
  }
  if (response.status === 404) {
    return null;
  }
  const body = await parseJsonResponse<{
    room: AgentNegotiationRoomRecord | null;
    migrationPending?: boolean;
  }>(response);
  return body.room ?? null;
}

export async function patchAgentCoordinationRoomRemote(input: {
  handshakeId: string;
  action: AgentCoordinationPatchAction;
  slotKey?: AgentNegotiationSlotKey;
  valueKo?: string;
  start?: Partial<StartAgentNegotiationRoomInput>;
  calendarBusyIntervals?: readonly CalendarBusyIntervalWire[];
  focusActive?: boolean;
  focusDeferMessageKo?: string;
}): Promise<AgentNegotiationRoomRecord> {
  assertAuthCircuitAllowsFetch();
  const response = await fetch(
    `${resolveAppOrigin()}/api/globe/market-coordination/${encodeURIComponent(input.handshakeId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: input.action,
        slotKey: input.slotKey,
        valueKo: input.valueKo,
        start: input.start,
        calendarBusyIntervals: input.calendarBusyIntervals,
        focusActive: input.focusActive,
        focusDeferMessageKo: input.focusDeferMessageKo,
      }),
    },
  );
  const body = await parseJsonResponse<{ room: AgentNegotiationRoomRecord }>(response);
  return body.room;
}
