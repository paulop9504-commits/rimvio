import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildMarketTradeSessionRecord,
  buildMarketTradeSessionView,
  type MarketTradeSessionCopy,
} from "@/lib/globe/market/build-market-trade-session-view";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import {
  findMarketHandshakeById,
  marketHandshakeRowToRecord,
  patchMarketHandshake,
  type MarketHandshakeDbRow,
} from "@/lib/globe/market/server/market-alignment-handshake-store";
import { findMarketIntentById } from "@/lib/globe/market/server/upsert-market-intent";
import {
  isMarketTradeSchedulingExpired,
  isScheduleCandidateAllowed,
} from "@/lib/globe/market/resolve-market-trade-scheduling";

const ACTIVE_TRADE_PHASES = ["pending_buyer_start", "active"] as const;

async function refreshSchedulingHandshake(
  supabase: SupabaseClient,
  handshake: Awaited<ReturnType<typeof findMarketHandshakeById>>,
) {
  if (!handshake) {
    return null;
  }
  if (isMarketTradeSchedulingExpired(handshake)) {
    return patchMarketHandshake(supabase, handshake.id, {
      tradeStatus: "expired",
    });
  }
  return handshake;
}

export async function listActiveMarketTradeSessionsForUser(
  supabase: SupabaseClient,
  userId: string,
  copy: MarketTradeSessionCopy,
): Promise<MarketTradeSessionView[]> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .or(`seeking_user_id.eq.${userId},listing_user_id.eq.${userId}`)
    .in("phase", [...ACTIVE_TRADE_PHASES])
    .neq("trade_status", "completed")
    .neq("trade_status", "expired")
    .order("updated_at", { ascending: false })
    .limit(12);

  if (error) {
    throw error;
  }

  const views: MarketTradeSessionView[] = [];
  for (const row of (data ?? []) as MarketHandshakeDbRow[]) {
    let handshake = marketHandshakeRowToRecord(row);
    handshake = (await refreshSchedulingHandshake(supabase, handshake)) ?? handshake;
    if (handshake.tradeStatus === "expired") {
      continue;
    }
    const listing = await findMarketIntentById(supabase, handshake.listingIntentId);
    if (!listing) {
      continue;
    }
    const record = buildMarketTradeSessionRecord({
      handshake,
      listing,
      viewerUserId: userId,
    });
    if (!record) {
      continue;
    }
    views.push(buildMarketTradeSessionView(record, copy));
  }
  return views;
}

export async function listResolvedMarketHandshakePairsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Array<{ seekingIntentId: string; listingIntentId: string }>> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("seeking_intent_id, listing_intent_id, phase, trade_status")
    .or(`seeking_user_id.eq.${userId},listing_user_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(48);

  if (error) {
    throw error;
  }

  const pairs: Array<{ seekingIntentId: string; listingIntentId: string }> = [];
  for (const row of data ?? []) {
    const phase = typeof row.phase === "string" ? row.phase : "";
    const tradeStatus = typeof row.trade_status === "string" ? row.trade_status : "";
    if (phase !== "completed" && tradeStatus !== "completed") {
      continue;
    }
    const seekingIntentId =
      typeof row.seeking_intent_id === "string" ? row.seeking_intent_id.trim() : "";
    const listingIntentId =
      typeof row.listing_intent_id === "string" ? row.listing_intent_id.trim() : "";
    if (!seekingIntentId || !listingIntentId) {
      continue;
    }
    pairs.push({ seekingIntentId, listingIntentId });
  }
  return pairs;
}

export async function confirmMarketTradeSchedule(
  supabase: SupabaseClient,
  userId: string,
  input: {
    handshakeId: string;
    meetAtIso: string;
    meetPlaceLabel?: string | null;
  },
): Promise<MarketTradeSessionView | null> {
  const handshake = await findMarketHandshakeById(supabase, input.handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.listingUserId !== userId) {
    throw new Error("listing_only");
  }
  if (!ACTIVE_TRADE_PHASES.includes(handshake.phase as (typeof ACTIVE_TRADE_PHASES)[number])) {
    throw new Error("invalid_phase");
  }
  if (handshake.tradeStatus !== "scheduling") {
    throw new Error("invalid_phase");
  }
  if (isMarketTradeSchedulingExpired(handshake)) {
    await patchMarketHandshake(supabase, handshake.id, { tradeStatus: "expired" });
    throw new Error("scheduling_expired");
  }
  if (!isScheduleCandidateAllowed(input.meetAtIso, handshake.scheduleCandidates)) {
    throw new Error("invalid_meet_at");
  }

  const meetAt = new Date(input.meetAtIso);
  if (!Number.isFinite(meetAt.getTime())) {
    throw new Error("invalid_meet_at");
  }

  const listing = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listing) {
    throw new Error("intent_not_found");
  }

  const placeLabel =
    input.meetPlaceLabel?.trim() ||
    handshake.meetPlaceLabel?.trim() ||
    listing.placeLabel?.trim() ||
    null;

  const updated = await patchMarketHandshake(supabase, handshake.id, {
    tradeStatus: "confirmed",
    meetMode: "host",
    meetAtIso: meetAt.toISOString(),
    meetPlaceLabel: placeLabel,
    meetLat: handshake.meetLat ?? listing.anchorLat ?? null,
    meetLng: handshake.meetLng ?? listing.anchorLng ?? null,
  });

  const record = buildMarketTradeSessionRecord({
    handshake: updated,
    listing,
    viewerUserId: userId,
  });
  if (!record) {
    return null;
  }

  const { marketTradeSessionCopy } = await import("@/lib/globe/market/market-trade-copy");
  return buildMarketTradeSessionView(record, marketTradeSessionCopy);
}

const DEPART_WINDOW_BEFORE_MS = 3 * 60 * 60 * 1000;
const DEPART_WINDOW_AFTER_MS = 2 * 60 * 60 * 1000;

function assertFiniteCoord(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(code);
  }
  return value;
}

async function buildTradeSessionViewForUser(
  supabase: SupabaseClient,
  handshake: Awaited<ReturnType<typeof findMarketHandshakeById>>,
  userId: string,
): Promise<MarketTradeSessionView | null> {
  if (!handshake) {
    return null;
  }
  const listing = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listing) {
    return null;
  }
  const record = buildMarketTradeSessionRecord({
    handshake,
    listing,
    viewerUserId: userId,
  });
  if (!record) {
    return null;
  }
  const { marketTradeSessionCopy } = await import("@/lib/globe/market/market-trade-copy");
  return buildMarketTradeSessionView(record, marketTradeSessionCopy);
}

export async function departMarketTradeGuest(
  supabase: SupabaseClient,
  userId: string,
  input: {
    handshakeId: string;
    lat: number;
    lng: number;
  },
): Promise<MarketTradeSessionView | null> {
  const handshake = await findMarketHandshakeById(supabase, input.handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.seekingUserId !== userId) {
    throw new Error("seeking_only");
  }
  if (handshake.tradeStatus !== "confirmed" && handshake.tradeStatus !== "en_route") {
    throw new Error("invalid_phase");
  }
  if (!handshake.meetAtIso) {
    throw new Error("meet_not_set");
  }

  const meetAt = new Date(handshake.meetAtIso).getTime();
  const now = Date.now();
  if (
    now < meetAt - DEPART_WINDOW_BEFORE_MS ||
    now > meetAt + DEPART_WINDOW_AFTER_MS
  ) {
    throw new Error("depart_window_closed");
  }

  const lat = assertFiniteCoord(input.lat, "invalid_lat");
  const lng = assertFiniteCoord(input.lng, "invalid_lng");
  const atIso = new Date().toISOString();

  const updated = await patchMarketHandshake(supabase, handshake.id, {
    tradeStatus: "en_route",
    guestShareLocation: true,
    guestLat: lat,
    guestLng: lng,
    guestLocationAtIso: atIso,
  });

  return buildTradeSessionViewForUser(supabase, updated, userId);
}

export async function pingMarketTradeGuestLocation(
  supabase: SupabaseClient,
  userId: string,
  input: {
    handshakeId: string;
    lat: number;
    lng: number;
  },
): Promise<MarketTradeSessionView | null> {
  const handshake = await findMarketHandshakeById(supabase, input.handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.seekingUserId !== userId) {
    throw new Error("seeking_only");
  }
  if (!handshake.guestShareLocation || handshake.tradeStatus !== "en_route") {
    throw new Error("invalid_phase");
  }

  const lat = assertFiniteCoord(input.lat, "invalid_lat");
  const lng = assertFiniteCoord(input.lng, "invalid_lng");
  const atIso = new Date().toISOString();

  const { computeMarketTradeHostEta } = await import(
    "@/lib/globe/market/compute-market-trade-host-eta"
  );
  const eta = computeMarketTradeHostEta({
    guestLat: lat,
    guestLng: lng,
    guestLocationAtIso: atIso,
    anchorLat: handshake.meetLat,
    anchorLng: handshake.meetLng,
  });

  const updated = await patchMarketHandshake(supabase, handshake.id, {
    guestLat: lat,
    guestLng: lng,
    guestLocationAtIso: atIso,
    ...(eta?.arrived ? { tradeStatus: "meeting" as const } : {}),
  });

  return buildTradeSessionViewForUser(supabase, updated, userId);
}

export async function proposeMarketTradePreferredSchedule(
  supabase: SupabaseClient,
  userId: string,
  input: {
    handshakeId: string;
    meetAtIso: string;
  },
): Promise<MarketTradeSessionView | null> {
  const handshake = await findMarketHandshakeById(supabase, input.handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.seekingUserId !== userId) {
    throw new Error("seeking_only");
  }
  if (handshake.tradeStatus !== "scheduling") {
    throw new Error("invalid_phase");
  }
  if (isMarketTradeSchedulingExpired(handshake)) {
    await patchMarketHandshake(supabase, handshake.id, { tradeStatus: "expired" });
    throw new Error("scheduling_expired");
  }
  if (!isScheduleCandidateAllowed(input.meetAtIso, handshake.scheduleCandidates)) {
    throw new Error("invalid_meet_at");
  }

  const meetAt = new Date(input.meetAtIso);
  if (!Number.isFinite(meetAt.getTime())) {
    throw new Error("invalid_meet_at");
  }

  const updated = await patchMarketHandshake(supabase, handshake.id, {
    preferredMeetAtIso: meetAt.toISOString(),
  });

  return buildTradeSessionViewForUser(supabase, updated, userId);
}
