import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ExperienceBridgeParticipant,
  ExperienceBridgeSnapshot,
  ExperienceBridgeState,
} from "@/lib/experience-bridge/experience-bridge-types";
import type { SupabaseClient } from "@supabase/supabase-js";

type BridgeRow = {
  event_id: string;
  host_user_id: string;
  peer_thread_id: string | null;
  title: string;
  place_label: string;
  lat: number;
  lng: number;
  event_snapshot: unknown;
  created_at: string;
};

type ParticipantRow = {
  bridge_event_id: string;
  user_id: string;
  display_name: string;
  role: "host" | "member";
  status: ExperienceBridgeParticipant["status"];
  invited_at: string;
  joined_at: string | null;
  left_at: string | null;
};

function rowToSnapshot(row: BridgeRow): ExperienceBridgeSnapshot {
  return {
    eventId: row.event_id,
    hostUserId: row.host_user_id,
    peerThreadId: row.peer_thread_id,
    title: row.title,
    placeLabel: row.place_label,
    lat: row.lat,
    lng: row.lng,
    eventSnapshot: row.event_snapshot as EventCandidate,
    createdAtIso: row.created_at,
  };
}

function rowToParticipant(row: ParticipantRow): ExperienceBridgeParticipant {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    status: row.status,
    role: row.role,
    invitedAtIso: row.invited_at,
    joinedAtIso: row.joined_at,
    leftAtIso: row.left_at,
  };
}

export async function fetchExperienceBridgeState(
  supabase: SupabaseClient,
  eventId: string,
): Promise<ExperienceBridgeState | null> {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  const { data: bridge, error: bridgeError } = await supabase
    .from("experience_bridges")
    .select("*")
    .eq("event_id", key)
    .maybeSingle();

  if (bridgeError) {
    throw bridgeError;
  }
  if (!bridge) {
    return null;
  }

  const { data: participants, error: participantError } = await supabase
    .from("experience_bridge_participants")
    .select("*")
    .eq("bridge_event_id", key)
    .order("invited_at", { ascending: true });

  if (participantError) {
    throw participantError;
  }

  return {
    bridge: rowToSnapshot(bridge as BridgeRow),
    participants: (participants ?? []).map((row) =>
      rowToParticipant(row as ParticipantRow),
    ),
  };
}

export async function upsertExperienceBridge(
  supabase: SupabaseClient,
  input: {
    bridge: ExperienceBridgeSnapshot;
    hostParticipant: ExperienceBridgeParticipant;
  },
): Promise<ExperienceBridgeState> {
  const { bridge, hostParticipant } = input;

  const { error: bridgeError } = await supabase.from("experience_bridges").upsert(
    {
      event_id: bridge.eventId,
      host_user_id: bridge.hostUserId,
      peer_thread_id: bridge.peerThreadId,
      title: bridge.title,
      place_label: bridge.placeLabel,
      lat: bridge.lat,
      lng: bridge.lng,
      event_snapshot: bridge.eventSnapshot as unknown as Record<string, unknown>,
    },
    { onConflict: "event_id" },
  );

  if (bridgeError) {
    throw bridgeError;
  }

  const { error: hostError } = await supabase
    .from("experience_bridge_participants")
    .upsert(
      {
        bridge_event_id: bridge.eventId,
        user_id: hostParticipant.userId,
        display_name: hostParticipant.displayName,
        role: hostParticipant.role,
        status: hostParticipant.status,
        invited_at: hostParticipant.invitedAtIso,
        joined_at: hostParticipant.joinedAtIso,
        left_at: hostParticipant.leftAtIso ?? null,
      },
      { onConflict: "bridge_event_id,user_id" },
    );

  if (hostError) {
    throw hostError;
  }

  const state = await fetchExperienceBridgeState(supabase, bridge.eventId);
  if (!state) {
    throw new Error("bridge_upsert_failed");
  }
  return state;
}

export async function upsertBridgeParticipantRow(
  supabase: SupabaseClient,
  bridgeEventId: string,
  participant: ExperienceBridgeParticipant,
): Promise<void> {
  const { error } = await supabase.from("experience_bridge_participants").upsert(
    {
      bridge_event_id: bridgeEventId,
      user_id: participant.userId,
      display_name: participant.displayName,
      role: participant.role,
      status: participant.status,
      invited_at: participant.invitedAtIso,
      joined_at: participant.joinedAtIso ?? null,
      left_at: participant.leftAtIso ?? null,
    },
    { onConflict: "bridge_event_id,user_id" },
  );

  if (error) {
    throw error;
  }
}

export async function listPendingBridgeInvitesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  Array<{
    state: ExperienceBridgeState;
    invite: ExperienceBridgeParticipant;
  }>
> {
  const { data: rows, error } = await supabase
    .from("experience_bridge_participants")
    .select("bridge_event_id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("invited_at", { ascending: false });

  if (error) {
    throw error;
  }

  const out: Array<{
    state: ExperienceBridgeState;
    invite: ExperienceBridgeParticipant;
  }> = [];

  for (const row of rows ?? []) {
    const state = await fetchExperienceBridgeState(
      supabase,
      row.bridge_event_id as string,
    );
    if (!state) {
      continue;
    }
    const invite = state.participants.find(
      (p) => p.userId === userId && p.status === "pending",
    );
    if (invite) {
      out.push({ state, invite });
    }
  }

  return out;
}
