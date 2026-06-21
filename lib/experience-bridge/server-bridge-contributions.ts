import type { ExperienceBridgeContribution } from "@/lib/experience-bridge/experience-bridge-types";
import type { BridgeContributionCapture } from "@/lib/experience-bridge/bridge-capture-spacetime";
import {
  bridgeCaptureTakenAtIso,
  normalizeBridgeContributionCapture,
} from "@/lib/experience-bridge/normalize-bridge-contribution-capture";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BridgeContributionRow = {
  bridge_event_id: string;
  contributor_user_id: string;
  capture_id: string;
  capture: unknown;
  file_hash?: string | null;
  taken_at_iso?: string | null;
  geohash?: string | null;
  storage_path?: string | null;
  created_at: string;
};

export type BridgeContribution = ExperienceBridgeContribution;

function rowToContribution(row: BridgeContributionRow): BridgeContribution | null {
  const capture = row.capture as BridgeContribution["capture"];
  if (!capture?.id?.trim()) {
    return null;
  }
  return {
    contributorUserId: row.contributor_user_id,
    capture: {
      ...capture,
      ownerUserId: capture.ownerUserId ?? row.contributor_user_id,
      fileHash: capture.fileHash ?? row.file_hash ?? null,
      takenAtIso: capture.takenAtIso ?? row.taken_at_iso ?? capture.capturedAtIso,
      geohash: capture.geohash ?? row.geohash ?? null,
      storagePath: capture.storagePath ?? row.storage_path ?? null,
    },
    createdAtIso: row.created_at,
  };
}

export async function listBridgeContributions(
  supabase: SupabaseClient,
  bridgeEventId: string,
  options?: { sinceIso?: string | null },
): Promise<BridgeContribution[]> {
  const key = bridgeEventId.trim();
  if (!key) {
    return [];
  }

  let query = supabase
    .from("experience_bridge_contributions")
    .select("*")
    .eq("bridge_event_id", key)
    .order("created_at", { ascending: true });

  const since = options?.sinceIso?.trim();
  if (since) {
    query = query.gt("created_at", since);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => rowToContribution(row as BridgeContributionRow))
    .filter((row): row is BridgeContribution => row !== null);
}

export async function upsertBridgeContribution(
  supabase: SupabaseClient,
  input: {
    bridgeEventId: string;
    contributorUserId: string;
    capture: BridgeContributionCapture;
  },
): Promise<void> {
  const normalized = normalizeBridgeContributionCapture(input.capture);
  const captureId = normalized.id.trim();
  if (!captureId) {
    throw new Error("capture_id_required");
  }

  const takenAtIso = bridgeCaptureTakenAtIso(normalized);

  const { error } = await supabase.from("experience_bridge_contributions").upsert(
    {
      bridge_event_id: input.bridgeEventId.trim(),
      contributor_user_id: input.contributorUserId,
      capture_id: captureId,
      capture: normalized as unknown as Record<string, unknown>,
      file_hash: normalized.fileHash ?? null,
      taken_at_iso: takenAtIso,
      geohash: normalized.geohash ?? null,
      storage_path: normalized.storagePath ?? null,
    },
    { onConflict: "bridge_event_id,contributor_user_id,capture_id" },
  );

  if (error) {
    throw error;
  }
}

export async function deleteBridgeContribution(
  supabase: SupabaseClient,
  input: {
    bridgeEventId: string;
    contributorUserId: string;
    captureId: string;
  },
): Promise<{ mediaUrl: string | null }> {
  const bridgeEventId = input.bridgeEventId.trim();
  const contributorUserId = input.contributorUserId.trim();
  const captureId = input.captureId.trim();
  if (!bridgeEventId || !contributorUserId || !captureId) {
    throw new Error("capture_id_required");
  }

  const { data, error: readError } = await supabase
    .from("experience_bridge_contributions")
    .select("capture")
    .eq("bridge_event_id", bridgeEventId)
    .eq("contributor_user_id", contributorUserId)
    .eq("capture_id", captureId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  const capture = data?.capture as BridgeContributionCapture | undefined;
  const mediaUrl =
    typeof capture?.url === "string" && capture.url.trim()
      ? capture.url.trim()
      : null;

  const { error: deleteError } = await supabase
    .from("experience_bridge_contributions")
    .delete()
    .eq("bridge_event_id", bridgeEventId)
    .eq("contributor_user_id", contributorUserId)
    .eq("capture_id", captureId);

  if (deleteError) {
    throw deleteError;
  }

  return { mediaUrl };
}
