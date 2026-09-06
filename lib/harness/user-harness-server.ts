import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { Harness } from "@/lib/rimvio-protocol/harness/schema";
import { validateHarness } from "@/lib/harness/validate";
import type {
  UserHarnessPatchInput,
  UserHarnessRecord,
  UserHarnessUpsertInput,
} from "@/lib/harness/personal-registry";

type Client = SupabaseClient<Database>;

type UserHarnessRow = Database["public"]["Tables"]["user_harnesses"]["Row"];

function rowToRecord(row: UserHarnessRow): UserHarnessRecord | null {
  const checked = validateHarness(row.harness);
  if (!checked.ok) return null;
  return {
    id: row.id,
    userId: row.user_id,
    harnessId: row.harness_id,
    harness: checked.harness,
    enabled: row.enabled,
    status: row.status,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listOwnUserHarnesses(
  supabase: Client,
  userId: string,
): Promise<UserHarnessRecord[]> {
  const { data, error } = await supabase
    .from("user_harnesses")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => rowToRecord(row as UserHarnessRow))
    .filter((r): r is UserHarnessRecord => r !== null);
}

export async function getOwnUserHarness(
  supabase: Client,
  userId: string,
  harnessId: string,
): Promise<UserHarnessRecord | null> {
  const { data, error } = await supabase
    .from("user_harnesses")
    .select("*")
    .eq("user_id", userId)
    .eq("harness_id", harnessId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return rowToRecord(data as UserHarnessRow);
}

export async function upsertOwnUserHarness(
  supabase: Client,
  userId: string,
  input: UserHarnessUpsertInput,
): Promise<UserHarnessRecord> {
  const now = new Date().toISOString();
  const harness: Harness = {
    ...input.harness,
    updatedAt: now,
  };

  const payload: Database["public"]["Tables"]["user_harnesses"]["Insert"] = {
    user_id: userId,
    harness_id: harness.id,
    harness: harness as unknown as Json,
    enabled: input.enabled ?? true,
    status: input.status ?? "draft",
    visibility: input.visibility ?? "private",
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("user_harnesses")
    .upsert(payload, { onConflict: "user_id,harness_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const record = rowToRecord(data as UserHarnessRow);
  if (!record) {
    throw new Error("saved_harness_invalid");
  }
  return record;
}

export async function patchOwnUserHarness(
  supabase: Client,
  userId: string,
  harnessId: string,
  patch: UserHarnessPatchInput,
): Promise<UserHarnessRecord> {
  const existing = await getOwnUserHarness(supabase, userId, harnessId);
  if (!existing) {
    throw new Error("not_found");
  }

  const now = new Date().toISOString();
  const nextHarness = patch.harness
    ? { ...patch.harness, id: harnessId, updatedAt: now }
    : existing.harness;

  const update: Database["public"]["Tables"]["user_harnesses"]["Update"] = {
    harness: nextHarness as unknown as Json,
    enabled: patch.enabled ?? existing.enabled,
    status: patch.status ?? existing.status,
    visibility: patch.visibility ?? existing.visibility,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("user_harnesses")
    .update(update)
    .eq("user_id", userId)
    .eq("harness_id", harnessId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const record = rowToRecord(data as UserHarnessRow);
  if (!record) {
    throw new Error("patched_harness_invalid");
  }
  return record;
}

export async function deleteOwnUserHarness(
  supabase: Client,
  userId: string,
  harnessId: string,
): Promise<boolean> {
  const existing = await getOwnUserHarness(supabase, userId, harnessId);
  if (!existing) return false;

  const { error } = await supabase
    .from("user_harnesses")
    .delete()
    .eq("user_id", userId)
    .eq("harness_id", harnessId);

  if (error) {
    throw new Error(error.message);
  }
  return true;
}
