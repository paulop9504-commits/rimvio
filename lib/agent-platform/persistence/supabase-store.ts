/**
 * Supabase durable SSOT for agent-platform registry · goal · sandbox.
 * Memory cache in durable-store.ts is warm layer; Supabase wins on hydrate.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";
import type { PersistedGoalState } from "../types";
import type { SandboxSession } from "@/lib/sandbox/types";

type CapabilityRow = {
  capability_id: string;
  platform_id: string;
  payload: CapabilityIndexEntry;
  updated_at: string;
};

type GoalRow = {
  context_event_id: string;
  payload: PersistedGoalState;
  updated_at: string;
};

type SandboxRow = {
  session_id: string;
  payload: SandboxSession;
  updated_at: string;
};

function adminClient() {
  return createServiceRoleClient();
}

export function isAgentPlatformSupabaseEnabled(): boolean {
  return adminClient() != null;
}

export async function hydrateRegistryFromSupabase(): Promise<CapabilityIndexEntry[]> {
  const admin = adminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("agent_platform_capabilities" as "links")
    .select("capability_id, platform_id, payload, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error || !data) return [];

  return (data as unknown as CapabilityRow[])
    .map((row) => row.payload)
    .filter((entry): entry is CapabilityIndexEntry => Boolean(entry?.capabilityId));
}

export async function upsertRegistryEntryToSupabase(entry: CapabilityIndexEntry): Promise<void> {
  const admin = adminClient();
  if (!admin) return;

  const row: CapabilityRow = {
    capability_id: entry.capabilityId,
    platform_id: entry.platformId,
    payload: entry,
    updated_at: new Date().toISOString(),
  };

  await admin
    .from("agent_platform_capabilities" as "links")
    .upsert(row as never, { onConflict: "capability_id" });
}

export async function upsertRegistryBatchToSupabase(entries: readonly CapabilityIndexEntry[]): Promise<void> {
  const admin = adminClient();
  if (!admin || entries.length === 0) return;

  const now = new Date().toISOString();
  const rows = entries.map((entry) => ({
    capability_id: entry.capabilityId,
    platform_id: entry.platformId,
    payload: entry,
    updated_at: now,
  }));

  await admin
    .from("agent_platform_capabilities" as "links")
    .upsert(rows as never, { onConflict: "capability_id" });
}

export async function hydrateGoalStatesFromSupabase(): Promise<PersistedGoalState[]> {
  const admin = adminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("agent_platform_goal_state" as "links")
    .select("context_event_id, payload, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  return (data as unknown as GoalRow[])
    .map((row) => row.payload)
    .filter((state): state is PersistedGoalState => Boolean(state?.contextEventId));
}

export async function upsertGoalStateToSupabase(state: PersistedGoalState): Promise<void> {
  const admin = adminClient();
  if (!admin) return;

  const row: GoalRow = {
    context_event_id: state.contextEventId,
    payload: state,
    updated_at: new Date().toISOString(),
  };

  await admin
    .from("agent_platform_goal_state" as "links")
    .upsert(row as never, { onConflict: "context_event_id" });
}

export async function hydrateSandboxSessionsFromSupabase(): Promise<SandboxSession[]> {
  const admin = adminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("agent_platform_sandbox_sessions" as "links")
    .select("session_id, payload, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return (data as unknown as SandboxRow[])
    .map((row) => row.payload)
    .filter((session): session is SandboxSession => Boolean(session?.sessionId));
}

export async function upsertSandboxSessionToSupabase(session: SandboxSession): Promise<void> {
  const admin = adminClient();
  if (!admin) return;

  const row: SandboxRow = {
    session_id: session.sessionId,
    payload: session,
    updated_at: new Date().toISOString(),
  };

  await admin
    .from("agent_platform_sandbox_sessions" as "links")
    .upsert(row as never, { onConflict: "session_id" });
}
