import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MarketHandshakePhase,
  MarketHandshakeRecord,
} from "@/lib/globe/market/market-handshake-types";
import { normalizeMarketTradeStatus } from "@/lib/globe/market/market-trade-pipeline";
import type {
  MarketMeetMode,
  MarketTradeStatus,
} from "@/lib/globe/market/market-trade-types";

export type MarketHandshakeDbRow = {
  id: string;
  seeking_intent_id: string;
  listing_intent_id: string;
  seeking_user_id: string;
  listing_user_id: string;
  thread_id: string | null;
  phase: MarketHandshakePhase;
  alignment_score: number | null;
  priority_hint: string;
  listing_accepted_at: string | null;
  buyer_started_at: string | null;
  seeking_confirmed_at: string | null;
  listing_confirmed_at: string | null;
  realized_price_krw: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  trade_status?: MarketTradeStatus | string | null;
  meet_at?: string | null;
  meet_place_label?: string | null;
  meet_lat?: number | null;
  meet_lng?: number | null;
  meet_mode?: MarketMeetMode | string | null;
  guest_share_location?: boolean | null;
  guest_lat?: number | null;
  guest_lng?: number | null;
  guest_location_at?: string | null;
  preferred_meet_at?: string | null;
  preferred_meet_date?: string | null;
  scheduling_expires_at?: string | null;
  schedule_candidates?: unknown;
  trade_cancel_reason?: string | null;
  trade_cancelled_at?: string | null;
};

function readTradeStatus(raw: MarketHandshakeDbRow): MarketTradeStatus {
  return normalizeMarketTradeStatus(raw.trade_status);
}

function readMeetMode(raw: MarketHandshakeDbRow): MarketMeetMode {
  return raw.meet_mode === "convergence" ? "convergence" : "host";
}

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readScheduleCandidates(raw: MarketHandshakeDbRow): string[] {
  if (!Array.isArray(raw.schedule_candidates)) {
    return [];
  }
  return raw.schedule_candidates.filter((value): value is string => typeof value === "string");
}

export function marketHandshakeRowToRecord(row: MarketHandshakeDbRow): MarketHandshakeRecord {
  return {
    id: row.id,
    seekingIntentId: row.seeking_intent_id,
    listingIntentId: row.listing_intent_id,
    seekingUserId: row.seeking_user_id,
    listingUserId: row.listing_user_id,
    threadId: row.thread_id,
    phase: row.phase,
    alignmentScore: row.alignment_score,
    priorityHint: row.priority_hint,
    listingAcceptedAtIso: row.listing_accepted_at,
    buyerStartedAtIso: row.buyer_started_at,
    seekingConfirmedAtIso: row.seeking_confirmed_at,
    listingConfirmedAtIso: row.listing_confirmed_at,
    realizedPriceKrw: row.realized_price_krw,
    completedAtIso: row.completed_at,
    createdAtIso: row.created_at,
    updatedAtIso: row.updated_at,
    tradeStatus: readTradeStatus(row),
    meetMode: readMeetMode(row),
    meetAtIso: row.meet_at ?? null,
    meetPlaceLabel: row.meet_place_label ?? null,
    meetLat: readFiniteCoord(row.meet_lat),
    meetLng: readFiniteCoord(row.meet_lng),
    guestShareLocation: row.guest_share_location === true,
    guestLat: readFiniteCoord(row.guest_lat),
    guestLng: readFiniteCoord(row.guest_lng),
    guestLocationAtIso: row.guest_location_at ?? null,
    scheduleCandidates: readScheduleCandidates(row),
    preferredMeetDateKey: row.preferred_meet_date?.trim() || null,
    preferredMeetAtIso: row.preferred_meet_at ?? null,
    schedulingExpiresAtIso: row.scheduling_expires_at ?? null,
    tradeCancelReasonId: row.trade_cancel_reason?.trim() || null,
    tradeCancelledAtIso: row.trade_cancelled_at ?? null,
  };
}

export async function findMarketHandshakeById(
  supabase: SupabaseClient,
  handshakeId: string,
): Promise<MarketHandshakeRecord | null> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .eq("id", handshakeId.trim())
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
}

export async function findMarketHandshakeByIntentPair(
  supabase: SupabaseClient,
  seekingIntentId: string,
  listingIntentId: string,
): Promise<MarketHandshakeRecord | null> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .eq("seeking_intent_id", seekingIntentId.trim())
    .eq("listing_intent_id", listingIntentId.trim())
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
}

export async function findMarketHandshakeByThreadId(
  supabase: SupabaseClient,
  threadId: string,
): Promise<MarketHandshakeRecord | null> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .eq("thread_id", threadId.trim())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
}

export async function listPendingHandshakesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<MarketHandshakeRecord[]> {
  const [listingRes, seekingRes] = await Promise.all([
    supabase
      .from("market_alignment_handshakes")
      .select("*")
      .eq("listing_user_id", userId)
      .eq("phase", "pending_listing")
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("market_alignment_handshakes")
      .select("*")
      .eq("seeking_user_id", userId)
      .eq("phase", "pending_buyer_start")
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);
  if (listingRes.error) {
    throw listingRes.error;
  }
  if (seekingRes.error) {
    throw seekingRes.error;
  }
  const rows = [...(listingRes.data ?? []), ...(seekingRes.data ?? [])] as MarketHandshakeDbRow[];
  return rows.map(marketHandshakeRowToRecord);
}

export async function upsertMarketHandshake(
  supabase: SupabaseClient,
  input: {
    seekingIntentId: string;
    listingIntentId: string;
    seekingUserId: string;
    listingUserId: string;
    alignmentScore: number;
    priorityHint: string;
  },
): Promise<MarketHandshakeRecord> {
  const { data: existing, error: readError } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .eq("seeking_intent_id", input.seekingIntentId)
    .eq("listing_intent_id", input.listingIntentId)
    .maybeSingle();
  if (readError) {
    throw readError;
  }
  const now = new Date().toISOString();
  if (existing) {
    const row = existing as MarketHandshakeDbRow;
    if (row.phase !== "pending_listing") {
      return marketHandshakeRowToRecord(row);
    }
    const { data, error } = await supabase
      .from("market_alignment_handshakes")
      .update({
        alignment_score: input.alignmentScore,
        priority_hint: input.priorityHint,
        updated_at: now,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) {
      throw error;
    }
    return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
  }

  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .insert({
      seeking_intent_id: input.seekingIntentId,
      listing_intent_id: input.listingIntentId,
      seeking_user_id: input.seekingUserId,
      listing_user_id: input.listingUserId,
      phase: "pending_listing",
      alignment_score: input.alignmentScore,
      priority_hint: input.priorityHint,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
}

export async function patchMarketHandshake(
  supabase: SupabaseClient,
  handshakeId: string,
  patch: {
    phase?: MarketHandshakePhase;
    threadId?: string | null;
    listingAcceptedAtIso?: string | null;
    buyerStartedAtIso?: string | null;
    seekingConfirmedAtIso?: string | null;
    listingConfirmedAtIso?: string | null;
    realizedPriceKrw?: number | null;
    completedAtIso?: string | null;
    tradeStatus?: MarketTradeStatus;
    meetMode?: MarketMeetMode;
    meetAtIso?: string | null;
    meetPlaceLabel?: string | null;
    meetLat?: number | null;
    meetLng?: number | null;
    guestShareLocation?: boolean;
    guestLat?: number | null;
    guestLng?: number | null;
    guestLocationAtIso?: string | null;
    preferredMeetAtIso?: string | null;
    preferredMeetDateKey?: string | null;
    schedulingExpiresAtIso?: string | null;
    scheduleCandidates?: readonly string[];
    tradeCancelReasonId?: string | null;
    tradeCancelledAtIso?: string | null;
  },
): Promise<MarketHandshakeRecord> {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.phase !== undefined) {
    row.phase = patch.phase;
  }
  if (patch.threadId !== undefined) {
    row.thread_id = patch.threadId;
  }
  if (patch.listingAcceptedAtIso !== undefined) {
    row.listing_accepted_at = patch.listingAcceptedAtIso;
  }
  if (patch.buyerStartedAtIso !== undefined) {
    row.buyer_started_at = patch.buyerStartedAtIso;
  }
  if (patch.seekingConfirmedAtIso !== undefined) {
    row.seeking_confirmed_at = patch.seekingConfirmedAtIso;
  }
  if (patch.listingConfirmedAtIso !== undefined) {
    row.listing_confirmed_at = patch.listingConfirmedAtIso;
  }
  if (patch.realizedPriceKrw !== undefined) {
    row.realized_price_krw = patch.realizedPriceKrw;
  }
  if (patch.completedAtIso !== undefined) {
    row.completed_at = patch.completedAtIso;
  }
  if (patch.tradeStatus !== undefined) {
    row.trade_status = patch.tradeStatus;
  }
  if (patch.meetAtIso !== undefined) {
    row.meet_at = patch.meetAtIso;
  }
  if (patch.meetPlaceLabel !== undefined) {
    row.meet_place_label = patch.meetPlaceLabel;
  }
  if (patch.meetLat !== undefined) {
    row.meet_lat = patch.meetLat;
  }
  if (patch.meetLng !== undefined) {
    row.meet_lng = patch.meetLng;
  }
  if (patch.meetMode !== undefined) {
    row.meet_mode = patch.meetMode;
  }
  if (patch.guestShareLocation !== undefined) {
    row.guest_share_location = patch.guestShareLocation;
  }
  if (patch.guestLat !== undefined) {
    row.guest_lat = patch.guestLat;
  }
  if (patch.guestLng !== undefined) {
    row.guest_lng = patch.guestLng;
  }
  if (patch.guestLocationAtIso !== undefined) {
    row.guest_location_at = patch.guestLocationAtIso;
  }
  if (patch.preferredMeetAtIso !== undefined) {
    row.preferred_meet_at = patch.preferredMeetAtIso;
  }
  if (patch.preferredMeetDateKey !== undefined) {
    row.preferred_meet_date = patch.preferredMeetDateKey;
  }
  if (patch.schedulingExpiresAtIso !== undefined) {
    row.scheduling_expires_at = patch.schedulingExpiresAtIso;
  }
  if (patch.scheduleCandidates !== undefined) {
    row.schedule_candidates = [...patch.scheduleCandidates];
  }
  if (patch.tradeCancelReasonId !== undefined) {
    row.trade_cancel_reason = patch.tradeCancelReasonId;
  }
  if (patch.tradeCancelledAtIso !== undefined) {
    row.trade_cancelled_at = patch.tradeCancelledAtIso;
  }

  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .update(row)
    .eq("id", handshakeId)
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
}

export async function updateMarketHandshakePhase(
  supabase: SupabaseClient,
  handshakeId: string,
  patch: {
    phase: MarketHandshakePhase;
    threadId?: string | null;
    listingAcceptedAtIso?: string | null;
    buyerStartedAtIso?: string | null;
  },
): Promise<MarketHandshakeRecord> {
  return patchMarketHandshake(supabase, handshakeId, patch);
}
