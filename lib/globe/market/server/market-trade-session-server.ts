import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildMarketTradeSessionRecord,
  buildMarketTradeSessionView,
  type MarketTradeSessionCopy,
} from "@/lib/globe/market/build-market-trade-session-view";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import type { MarketAvailabilityPreset } from "@/lib/globe/market/market-availability-preset";
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
import {
  isMeetTimeAllowedForTrade,
  isScheduleDateCandidateAllowed,
  marketTradeScheduleDateCandidatesNeedBackfill,
  resolveMarketTradeScheduleDateCandidates,
} from "@/lib/globe/market/market-trade-schedule";
import { isMarketTradeDepartWindowOpen } from "@/lib/globe/market/market-trade-depart-window";
import { findListingUserMeetTimeConflict } from "@/lib/globe/market/server/find-listing-user-meet-conflict";
import {
  marketTradeCancelReasonLabelKo,
  readMarketTradeCancelReasonId,
  type MarketTradeCancelReasonId,
} from "@/lib/globe/market/market-trade-cancel-reasons";
import { insertPeerMessage } from "@/lib/peer-chat/server-peer-chat";
import { copy } from "@/lib/copy/human-ko";
import {
  isExplicitMarketTradePipeline,
  MARKET_TRADE_ACTIVE_HANDSHAKE_PHASES,
  normalizeMarketTradeStatus,
  shouldIncludeInActiveMarketTradeList,
} from "@/lib/globe/market/market-trade-pipeline";
import { getServerRegionalProfile } from "@/lib/preferences/server-regional-profile";
import type { RegionalProfile } from "@/lib/preferences/regional-profile";
import {
  MARKET_SCHEDULING_SLA_HOURS,
  readMarketAvailabilityPreset,
} from "@/lib/globe/market/market-availability-preset";

const ACTIVE_TRADE_PHASES = [...MARKET_TRADE_ACTIVE_HANDSHAKE_PHASES] as const;

const CANCELLABLE_TRADE_STATUSES = [
  "seller_proposed",
  "confirmed",
  "en_route",
  "meeting",
] as const;

async function assertListingMeetTimeAvailable(
  supabase: SupabaseClient,
  input: {
    listingUserId: string;
    meetAtIso: string;
    handshakeId: string;
  },
): Promise<void> {
  const conflict = await findListingUserMeetTimeConflict(supabase, {
    listingUserId: input.listingUserId,
    meetAtIso: input.meetAtIso,
    excludeHandshakeId: input.handshakeId,
  });
  if (conflict) {
    throw new Error("seller_meet_conflict");
  }
}

async function ensureMarketTradeScheduleDateCandidates(
  supabase: SupabaseClient,
  handshake: MarketHandshakeRecord,
  preset: MarketAvailabilityPreset,
): Promise<MarketHandshakeRecord> {
  if (handshake.tradeStatus !== "scheduling") {
    return handshake;
  }
  if (!marketTradeScheduleDateCandidatesNeedBackfill(handshake.scheduleCandidates, preset)) {
    return handshake;
  }
  const resolved = resolveMarketTradeScheduleDateCandidates(
    handshake.scheduleCandidates,
    preset,
  );
  if (resolved.length === 0) {
    return handshake;
  }
  const updated = await patchMarketHandshake(supabase, handshake.id, {
    scheduleCandidates: resolved,
  });
  return updated ?? handshake;
}

async function ensureBuyerPickedDayTradeStatus(
  supabase: SupabaseClient,
  handshake: MarketHandshakeRecord,
): Promise<MarketHandshakeRecord> {
  const dateKey = handshake.preferredMeetDateKey?.trim();
  if (!dateKey || handshake.tradeStatus !== "scheduling") {
    return handshake;
  }
  const updated = await patchMarketHandshake(supabase, handshake.id, {
    tradeStatus: "buyer_picked_day",
  });
  return updated ?? handshake;
}

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
  sessionCopy: MarketTradeSessionCopy,
  regionalProfile?: RegionalProfile,
): Promise<MarketTradeSessionView[]> {
  const profile = regionalProfile ?? (await getServerRegionalProfile());
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .or(`seeking_user_id.eq.${userId},listing_user_id.eq.${userId}`)
    .in("phase", [...ACTIVE_TRADE_PHASES])
    .neq("trade_status", "completed")
    .neq("trade_status", "expired")
    .neq("trade_status", "cancelled")
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
    if (
      normalizeMarketTradeStatus(handshake.tradeStatus) === "scheduling" &&
      !handshake.schedulingExpiresAtIso?.trim()
    ) {
      await patchMarketHandshake(supabase, handshake.id, { tradeStatus: "chat" });
      continue;
    }

    const preset = readMarketAvailabilityPreset(listing.detail?.availabilityPreset);
    if (handshake.schedulingExpiresAtIso?.trim()) {
      handshake = await ensureMarketTradeScheduleDateCandidates(
        supabase,
        handshake,
        preset,
      );
    }
    handshake = await ensureBuyerPickedDayTradeStatus(supabase, handshake);
    if (
      !shouldIncludeInActiveMarketTradeList({
        phase: handshake.phase,
        tradeStatus: handshake.tradeStatus,
        schedulingExpiresAtIso: handshake.schedulingExpiresAtIso,
      })
    ) {
      continue;
    }
    const record = buildMarketTradeSessionRecord({
      handshake,
      listing,
      viewerUserId: userId,
      regionalProfile: profile,
      priceOpenLabel: sessionCopy.priceOpen,
    });
    if (!record) {
      continue;
    }
    views.push(buildMarketTradeSessionView(record, sessionCopy, new Date(), profile));
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

export async function pickMarketTradeDay(
  supabase: SupabaseClient,
  userId: string,
  input: {
    handshakeId: string;
    dateKey: string;
  },
): Promise<MarketTradeSessionView | null> {
  let handshake = await findMarketHandshakeById(supabase, input.handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.seekingUserId !== userId) {
    throw new Error("seeking_only");
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
  const listing = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listing) {
    throw new Error("intent_not_found");
  }
  const preset = readMarketAvailabilityPreset(listing.detail?.availabilityPreset);
  handshake = await ensureMarketTradeScheduleDateCandidates(supabase, handshake, preset);
  const dateKey = input.dateKey.trim();
  const dateCandidates = resolveMarketTradeScheduleDateCandidates(
    handshake.scheduleCandidates,
    preset,
  );
  if (!isScheduleDateCandidateAllowed(dateKey, dateCandidates)) {
    throw new Error("invalid_meet_at");
  }

  const sellerExpiresAt = new Date(
    Date.now() + MARKET_SCHEDULING_SLA_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const updated = await patchMarketHandshake(supabase, handshake.id, {
    tradeStatus: "buyer_picked_day",
    preferredMeetDateKey: dateKey,
    preferredMeetAtIso: null,
    meetAtIso: null,
    schedulingExpiresAtIso: sellerExpiresAt,
  });

  return buildTradeSessionViewForUser(supabase, updated, userId);
}

export async function proposeMarketTradeSchedule(
  supabase: SupabaseClient,
  userId: string,
  input: {
    handshakeId: string;
    meetAtIso: string;
    meetPlaceLabel?: string | null;
  },
): Promise<MarketTradeSessionView | null> {
  let handshake = await findMarketHandshakeById(supabase, input.handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.listingUserId !== userId) {
    throw new Error("listing_only");
  }
  if (!ACTIVE_TRADE_PHASES.includes(handshake.phase as (typeof ACTIVE_TRADE_PHASES)[number])) {
    throw new Error("invalid_phase");
  }
  if (handshake.tradeStatus !== "buyer_picked_day") {
    const pendingDateKey = handshake.preferredMeetDateKey?.trim();
    if (handshake.tradeStatus !== "scheduling" || !pendingDateKey) {
      throw new Error("invalid_phase");
    }
    handshake = await patchMarketHandshake(supabase, handshake.id, {
      tradeStatus: "buyer_picked_day",
    });
  }
  if (isMarketTradeSchedulingExpired(handshake)) {
    await patchMarketHandshake(supabase, handshake.id, { tradeStatus: "expired" });
    throw new Error("scheduling_expired");
  }
  const dateKey = handshake.preferredMeetDateKey?.trim();
  if (!dateKey) {
    throw new Error("invalid_meet_at");
  }

  const listing = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listing) {
    throw new Error("intent_not_found");
  }
  const preset = readMarketAvailabilityPreset(listing.detail?.availabilityPreset);
  if (!isMeetTimeAllowedForTrade({
    meetAtIso: input.meetAtIso,
    dateKey,
    preset,
  })) {
    throw new Error("invalid_meet_at");
  }

  const meetAt = new Date(input.meetAtIso);
  if (!Number.isFinite(meetAt.getTime())) {
    throw new Error("invalid_meet_at");
  }

  await assertListingMeetTimeAvailable(supabase, {
    listingUserId: handshake.listingUserId,
    meetAtIso: meetAt.toISOString(),
    handshakeId: handshake.id,
  });

  const placeLabel =
    input.meetPlaceLabel?.trim() ||
    handshake.meetPlaceLabel?.trim() ||
    listing.placeLabel?.trim() ||
    null;

  const updated = await patchMarketHandshake(supabase, handshake.id, {
    tradeStatus: "seller_proposed",
    meetAtIso: meetAt.toISOString(),
    meetPlaceLabel: placeLabel,
    meetLat: handshake.meetLat ?? listing.anchorLat ?? null,
    meetLng: handshake.meetLng ?? listing.anchorLng ?? null,
    schedulingExpiresAtIso: new Date(
      Date.now() + MARKET_SCHEDULING_SLA_HOURS * 60 * 60 * 1000,
    ).toISOString(),
  });

  return buildTradeSessionViewForUser(supabase, updated, userId);
}

export async function acceptMarketTradeSchedule(
  supabase: SupabaseClient,
  userId: string,
  input: {
    handshakeId: string;
  },
): Promise<MarketTradeSessionView | null> {
  const handshake = await findMarketHandshakeById(supabase, input.handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.seekingUserId !== userId) {
    throw new Error("seeking_only");
  }
  if (!ACTIVE_TRADE_PHASES.includes(handshake.phase as (typeof ACTIVE_TRADE_PHASES)[number])) {
    throw new Error("invalid_phase");
  }
  if (handshake.tradeStatus !== "seller_proposed") {
    throw new Error("invalid_phase");
  }
  if (isMarketTradeSchedulingExpired(handshake)) {
    await patchMarketHandshake(supabase, handshake.id, { tradeStatus: "expired" });
    throw new Error("scheduling_expired");
  }
  if (!handshake.meetAtIso) {
    throw new Error("meet_not_set");
  }

  await assertListingMeetTimeAvailable(supabase, {
    listingUserId: handshake.listingUserId,
    meetAtIso: handshake.meetAtIso,
    handshakeId: handshake.id,
  });

  const updated = await patchMarketHandshake(supabase, handshake.id, {
    tradeStatus: "confirmed",
    meetMode: "host",
    schedulingExpiresAtIso: null,
  });

  return buildTradeSessionViewForUser(supabase, updated, userId);
}

export async function cancelMarketTradeReservation(
  supabase: SupabaseClient,
  userId: string,
  input: {
    handshakeId: string;
    reasonId: string;
  },
): Promise<MarketTradeSessionView | null> {
  const handshake = await findMarketHandshakeById(supabase, input.handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  const isSeeking = handshake.seekingUserId === userId;
  const isListing = handshake.listingUserId === userId;
  if (!isSeeking && !isListing) {
    throw new Error("unauthorized");
  }
  if (!ACTIVE_TRADE_PHASES.includes(handshake.phase as (typeof ACTIVE_TRADE_PHASES)[number])) {
    throw new Error("invalid_phase");
  }
  const cancellable = CANCELLABLE_TRADE_STATUSES.includes(
    handshake.tradeStatus as (typeof CANCELLABLE_TRADE_STATUSES)[number],
  );
  if (!cancellable) {
    throw new Error("invalid_phase");
  }
  if (handshake.tradeStatus === "seller_proposed" && !handshake.meetAtIso) {
    throw new Error("invalid_phase");
  }

  const reasonId: MarketTradeCancelReasonId | null = readMarketTradeCancelReasonId(
    input.reasonId,
  );
  if (!reasonId) {
    throw new Error("invalid_cancel_reason");
  }

  const nowIso = new Date().toISOString();
  const updated = await patchMarketHandshake(supabase, handshake.id, {
    tradeStatus: "cancelled",
    tradeCancelReasonId: reasonId,
    tradeCancelledAtIso: nowIso,
    guestShareLocation: false,
    guestLat: null,
    guestLng: null,
    guestLocationAtIso: null,
    schedulingExpiresAtIso: null,
  });

  if (handshake.threadId) {
    const reasonLabel = marketTradeCancelReasonLabelKo(reasonId);
    await insertPeerMessage(supabase, {
      threadId: handshake.threadId,
      senderUserId: userId,
      messageType: "system",
      body: copy.globe.marketTradeCancelReservationSystem({
        reasonLabel,
        bySeeking: isSeeking,
      }),
    });
  }

  return buildTradeSessionViewForUser(supabase, updated, userId);
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

  await assertListingMeetTimeAvailable(supabase, {
    listingUserId: handshake.listingUserId,
    meetAtIso: meetAt.toISOString(),
    handshakeId: handshake.id,
  });

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

  const profile = await getServerRegionalProfile();
  const record = buildMarketTradeSessionRecord({
    handshake: updated,
    listing,
    viewerUserId: userId,
    regionalProfile: profile,
  });
  if (!record) {
    return null;
  }

  const { marketTradeSessionCopy } = await import("@/lib/globe/market/market-trade-copy");
  return buildMarketTradeSessionView(record, marketTradeSessionCopy, new Date(), profile);
}


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
  const profile = await getServerRegionalProfile();
  const listing = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listing) {
    return null;
  }
  const record = buildMarketTradeSessionRecord({
    handshake,
    listing,
    viewerUserId: userId,
    regionalProfile: profile,
  });
  if (!record) {
    return null;
  }
  const { marketTradeSessionCopy } = await import("@/lib/globe/market/market-trade-copy");
  return buildMarketTradeSessionView(record, marketTradeSessionCopy, new Date(), profile);
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
  if (!Number.isFinite(meetAt)) {
    throw new Error("meet_not_set");
  }
  if (!isMarketTradeDepartWindowOpen(handshake.meetAtIso)) {
    throw new Error("depart_window_closed");
  }

  const lat = assertFiniteCoord(input.lat, "invalid_lat");
  const lng = assertFiniteCoord(input.lng, "invalid_lng");
  const atIso = new Date().toISOString();
  const wasFirstDepart = handshake.tradeStatus === "confirmed";

  const updated = await patchMarketHandshake(supabase, handshake.id, {
    tradeStatus: "en_route",
    guestShareLocation: true,
    guestLat: lat,
    guestLng: lng,
    guestLocationAtIso: atIso,
  });

  if (wasFirstDepart && handshake.threadId) {
    await insertPeerMessage(supabase, {
      threadId: handshake.threadId,
      senderUserId: userId,
      messageType: "system",
      body: copy.globe.marketTradeBuyerDepartedSystem,
    });
  }

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
