import type { SupabaseClient } from "@supabase/supabase-js";
import {
  answerAgentNegotiationSlot,
  approveAgentNegotiationProposal,
  createAgentNegotiationRoom,
  refreshAgentNegotiationPauseState,
} from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import {
  mergeCalendarBusyIntoRoom,
  parseCalendarBusyIntervalWire,
} from "@/lib/globe/market/coordination/coordination-calendar-busy";
import { refreshAgentNegotiationFocusDeferState } from "@/lib/globe/market/coordination/read-user-focus-defer";
import type {
  AgentNegotiationRoomRecord,
  AgentNegotiationSlotKey,
  AgentNegotiationState,
  AgentSlotQuestion,
  StartAgentNegotiationRoomInput,
} from "@/lib/globe/market/coordination/agent-negotiation-types";
import { formatMarketPriceLine } from "@/lib/globe/market/format-market-price-line";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { resolveViewerMarketRole } from "@/lib/globe/market/market-intent-role";
import { findMarketHandshakeById } from "@/lib/globe/market/server/market-alignment-handshake-store";
import { findMarketIntentById } from "@/lib/globe/market/server/upsert-market-intent";
import { fetchPeerPublicProfileByUserId } from "@/lib/peer-chat/peer-public-profile";
import { runAgentNegotiationLlmTurn } from "@/lib/globe/market/coordination/run-agent-negotiation-llm-turn";
import { commitAgentCoordinationApprovalToHandshake } from "@/lib/globe/market/coordination/server/commit-agent-coordination-approval";
import {
  AGENT_COORDINATION_BOOTSTRAP_MAX_TICKS,
  AGENT_NEGOTIATION_MAX_TURNS,
} from "@/lib/globe/market/coordination/agent-negotiation-types";
import { MARKET_TRADE_TERMINAL_STATUSES } from "@/lib/globe/market/market-trade-pipeline";
import { readMarketAvailabilityPreset } from "@/lib/globe/market/market-availability-preset";
import { getServerRegionalProfile } from "@/lib/preferences/server-regional-profile";

/** Canonical engine perspective — slot schema uses ownerRole, not viewer. */
const ENGINE_VIEWER_ROLE: MarketIntentRole = "seeking";

export type AgentCoordinationDbRow = {
  handshake_id: string;
  state: AgentNegotiationState;
  log_json: AgentNegotiationRoomRecord["log"];
  filled_slots: AgentNegotiationRoomRecord["filledSlots"];
  pending_question: AgentSlotQuestion | null;
  proposal: AgentNegotiationRoomRecord["proposal"];
  turn_count: number;
  waiting_since: string | null;
  seeking_approved_at: string | null;
  listing_approved_at: string | null;
  product_title: string;
  price_line: string;
  thread_id: string | null;
  created_at: string;
  updated_at: string;
};

function readJsonObject(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") {
      out[key] = raw;
    }
  }
  return out;
}

function snapshotToEngineRoom(row: AgentCoordinationDbRow): AgentNegotiationRoomRecord {
  return {
    handshakeId: row.handshake_id,
    threadId: row.thread_id,
    productTitle: row.product_title,
    priceLine: row.price_line,
    peerDisplayName: "상대",
    viewerRole: ENGINE_VIEWER_ROLE,
    state: row.state,
    log: Array.isArray(row.log_json) ? row.log_json : [],
    filledSlots: readJsonObject(row.filled_slots) as AgentNegotiationRoomRecord["filledSlots"],
    pendingQuestion: row.pending_question,
    proposal: row.proposal,
    turnCount: row.turn_count,
    waitingSinceIso: row.waiting_since,
    seekingApprovedAtIso: row.seeking_approved_at,
    listingApprovedAtIso: row.listing_approved_at,
    createdAtIso: row.created_at,
    updatedAtIso: row.updated_at,
  };
}

function engineRoomToPatch(room: AgentNegotiationRoomRecord): Partial<AgentCoordinationDbRow> {
  return {
    state: room.state,
    log_json: room.log,
    filled_slots: room.filledSlots,
    pending_question: room.pendingQuestion,
    proposal: room.proposal,
    turn_count: room.turnCount,
    waiting_since: room.waitingSinceIso,
    seeking_approved_at: room.seekingApprovedAtIso,
    listing_approved_at: room.listingApprovedAtIso,
    updated_at: new Date().toISOString(),
  };
}

async function resolvePeerDisplayName(
  supabase: SupabaseClient,
  handshake: MarketHandshakeRecord,
  viewerUserId: string,
): Promise<string> {
  const otherUserId =
    viewerUserId === handshake.seekingUserId
      ? handshake.listingUserId
      : handshake.seekingUserId;
  const profile = await fetchPeerPublicProfileByUserId(supabase, otherUserId);
  return profile?.displayName?.trim() || "상대";
}

export function projectCoordinationRoomForViewer(input: {
  row: AgentCoordinationDbRow;
  handshake: MarketHandshakeRecord;
  viewerUserId: string;
  peerDisplayName: string;
}): AgentNegotiationRoomRecord {
  const viewerRole = resolveViewerMarketRole({
    viewerUserId: input.viewerUserId,
    seekingUserId: input.handshake.seekingUserId,
    listingUserId: input.handshake.listingUserId,
  });
  const base = snapshotToEngineRoom(input.row);
  return {
    ...base,
    viewerRole: viewerRole ?? ENGINE_VIEWER_ROLE,
    peerDisplayName: input.peerDisplayName,
  };
}

async function assertHandshakeParticipant(
  supabase: SupabaseClient,
  handshakeId: string,
  userId: string,
): Promise<MarketHandshakeRecord> {
  const handshake = await findMarketHandshakeById(supabase, handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (userId !== handshake.seekingUserId && userId !== handshake.listingUserId) {
    throw new Error("forbidden");
  }
  return handshake;
}

export async function findAgentCoordinationRoomRow(
  supabase: SupabaseClient,
  handshakeId: string,
): Promise<AgentCoordinationDbRow | null> {
  const { data, error } = await supabase
    .from("market_agent_coordination_rooms")
    .select("*")
    .eq("handshake_id", handshakeId.trim())
    .maybeSingle();
  if (error) {
    if (
      error.message.includes("market_agent_coordination_rooms") ||
      error.message.includes("does not exist")
    ) {
      return null;
    }
    throw error;
  }
  if (!data) {
    return null;
  }
  return data as AgentCoordinationDbRow;
}

async function upsertAgentCoordinationRow(
  supabase: SupabaseClient,
  handshakeId: string,
  patch: Partial<AgentCoordinationDbRow> & Pick<AgentCoordinationDbRow, "handshake_id">,
): Promise<AgentCoordinationDbRow> {
  const { data, error } = await supabase
    .from("market_agent_coordination_rooms")
    .upsert(patch, { onConflict: "handshake_id" })
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return data as AgentCoordinationDbRow;
}

async function saveEngineRoom(
  supabase: SupabaseClient,
  handshakeId: string,
  room: AgentNegotiationRoomRecord,
  meta?: Partial<Pick<AgentCoordinationDbRow, "product_title" | "price_line" | "thread_id">>,
): Promise<AgentCoordinationDbRow> {
  return upsertAgentCoordinationRow(supabase, handshakeId, {
    handshake_id: handshakeId,
    ...engineRoomToPatch(room),
    product_title: meta?.product_title ?? room.productTitle,
    price_line: meta?.price_line ?? room.priceLine,
    thread_id: meta?.thread_id ?? room.threadId,
  });
}

async function resolveListingMeta(
  supabase: SupabaseClient,
  handshake: MarketHandshakeRecord,
  input?: Partial<StartAgentNegotiationRoomInput>,
): Promise<
  Pick<
    StartAgentNegotiationRoomInput,
    | "productTitle"
    | "priceLine"
    | "threadId"
    | "availabilityPreset"
    | "priceMinKrw"
    | "priceMaxKrw"
    | "calendarBusyIntervals"
  >
> {
  const listing = await findMarketIntentById(supabase, handshake.listingIntentId);
  const regionalProfile = await getServerRegionalProfile();
  if (input?.productTitle?.trim() && input.priceLine?.trim()) {
    return {
      productTitle: input.productTitle.trim(),
      priceLine: input.priceLine.trim(),
      threadId: input.threadId ?? handshake.threadId,
      availabilityPreset: readMarketAvailabilityPreset(
        input.availabilityPreset ?? listing?.detail?.availabilityPreset,
      ),
      priceMinKrw: input.priceMinKrw ?? listing?.priceMinKrw ?? null,
      priceMaxKrw: input.priceMaxKrw ?? listing?.priceMaxKrw ?? null,
      calendarBusyIntervals: input.calendarBusyIntervals,
    };
  }
  const productTitle =
    input?.productTitle?.trim() ||
    listing?.detail.productName?.trim() ||
    listing?.title?.trim() ||
    "거래";
  const priceLine =
    input?.priceLine?.trim() ||
    (listing
      ? formatMarketPriceLine(
          listing.priceMinKrw,
          listing.priceMaxKrw,
          regionalProfile,
        )
      : "");
  return {
    productTitle,
    priceLine,
    threadId: input?.threadId ?? handshake.threadId,
    availabilityPreset: readMarketAvailabilityPreset(
      input?.availabilityPreset ?? listing?.detail?.availabilityPreset,
    ),
    priceMinKrw: input?.priceMinKrw ?? listing?.priceMinKrw ?? null,
    priceMaxKrw: input?.priceMaxKrw ?? listing?.priceMaxKrw ?? null,
    calendarBusyIntervals: input?.calendarBusyIntervals,
  };
}

function mergeListingSlotContext(
  room: AgentNegotiationRoomRecord,
  meta: Pick<
    StartAgentNegotiationRoomInput,
    | "availabilityPreset"
    | "priceMinKrw"
    | "priceMaxKrw"
    | "calendarBusyIntervals"
  >,
): AgentNegotiationRoomRecord {
  const merged: AgentNegotiationRoomRecord = {
    ...room,
    availabilityPreset: meta.availabilityPreset ?? room.availabilityPreset,
    priceMinKrw: meta.priceMinKrw ?? room.priceMinKrw,
    priceMaxKrw: meta.priceMaxKrw ?? room.priceMaxKrw,
    calendarBusyIntervals:
      meta.calendarBusyIntervals ?? room.calendarBusyIntervals,
  };
  return mergeCalendarBusyIntoRoom(merged, merged.calendarBusyIntervals);
}

function applyCoordinationClientContext(
  room: AgentNegotiationRoomRecord,
  input?: {
    calendarBusyIntervals?: unknown;
    focusActive?: boolean;
    focusDeferMessageKo?: string;
  },
): AgentNegotiationRoomRecord {
  let next = room;
  const busy = parseCalendarBusyIntervalWire(input?.calendarBusyIntervals);
  if (busy.length > 0) {
    next = mergeCalendarBusyIntoRoom(next, busy);
  }
  if (typeof input?.focusActive === "boolean" && input.focusDeferMessageKo?.trim()) {
    next = refreshAgentNegotiationFocusDeferState(
      next,
      input.focusActive,
      input.focusDeferMessageKo.trim(),
    );
  }
  return next;
}

export async function getAgentCoordinationRoomForUser(
  supabase: SupabaseClient,
  userId: string,
  handshakeId: string,
): Promise<AgentNegotiationRoomRecord | null> {
  const handshake = await assertHandshakeParticipant(supabase, handshakeId, userId);
  const row = await findAgentCoordinationRoomRow(supabase, handshakeId);
  if (!row) {
    return null;
  }
  const peerDisplayName = await resolvePeerDisplayName(supabase, handshake, userId);
  let engineRoom = refreshAgentNegotiationPauseState(snapshotToEngineRoom(row));
  if (engineRoom.state !== row.state) {
    const saved = await saveEngineRoom(supabase, handshakeId, engineRoom);
    return projectCoordinationRoomForViewer({
      row: saved,
      handshake,
      viewerUserId: userId,
      peerDisplayName,
    });
  }
  return projectCoordinationRoomForViewer({
    row,
    handshake,
    viewerUserId: userId,
    peerDisplayName,
  });
}

export async function listActiveAgentCoordinationRoomsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<AgentNegotiationRoomRecord[]> {
  const { data: handshakeRows, error: handshakeError } = await supabase
    .from("market_alignment_handshakes")
    .select("id")
    .or(`seeking_user_id.eq.${userId},listing_user_id.eq.${userId}`);
  if (handshakeError) {
    if (handshakeError.message.includes("market_agent_coordination_rooms")) {
      return [];
    }
    throw handshakeError;
  }
  const handshakeIds = (handshakeRows ?? []).map((row) => row.id as string);
  if (handshakeIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("market_agent_coordination_rooms")
    .select("*")
    .in("handshake_id", handshakeIds)
    .in("state", ["NEGOTIATING", "WAITING_USER_INPUT", "AGREED", "PAUSED"])
    .order("updated_at", { ascending: false });
  if (error) {
    if (
      error.message.includes("market_agent_coordination_rooms") ||
      error.message.includes("does not exist")
    ) {
      return [];
    }
    throw error;
  }

  const rooms: AgentNegotiationRoomRecord[] = [];
  for (const raw of data ?? []) {
    const row = raw as AgentCoordinationDbRow;
    const handshake = await findMarketHandshakeById(supabase, row.handshake_id);
    if (!handshake) {
      continue;
    }
    const peerDisplayName = await resolvePeerDisplayName(supabase, handshake, userId);
    rooms.push(
      projectCoordinationRoomForViewer({
        row,
        handshake,
        viewerUserId: userId,
        peerDisplayName,
      }),
    );
  }
  return rooms;
}

function isHandshakeEligibleForCoordinationBootstrap(
  handshake: MarketHandshakeRecord,
): boolean {
  if (handshake.phase === "completed") {
    return false;
  }
  const tradeStatus = handshake.tradeStatus?.trim() || "chat";
  return !(
    MARKET_TRADE_TERMINAL_STATUSES as readonly string[]
  ).includes(tradeStatus);
}

async function ensureAgentCoordinationRoomForHandshake(
  supabase: SupabaseClient,
  handshake: MarketHandshakeRecord,
): Promise<AgentCoordinationDbRow | null> {
  const existing = await findAgentCoordinationRoomRow(supabase, handshake.id);
  if (existing) {
    return existing;
  }
  const meta = await resolveListingMeta(supabase, handshake);
  const created = createAgentNegotiationRoom({
    handshakeId: handshake.id,
    threadId: meta.threadId ?? null,
    productTitle: meta.productTitle,
    priceLine: meta.priceLine,
    peerDisplayName: "상대",
    viewerRole: ENGINE_VIEWER_ROLE,
  });
  return saveEngineRoom(supabase, handshake.id, created, {
    product_title: meta.productTitle,
    price_line: meta.priceLine,
    thread_id: meta.threadId ?? null,
  });
}

export async function runAgentCoordinationTickLoop(
  supabase: SupabaseClient,
  handshakeId: string,
  maxTicks: number = AGENT_COORDINATION_BOOTSTRAP_MAX_TICKS,
): Promise<void> {
  const row = await findAgentCoordinationRoomRow(supabase, handshakeId);
  if (!row) {
    return;
  }

  let engineRoom = refreshAgentNegotiationPauseState(snapshotToEngineRoom(row));
  let ticks = 0;

  while (
    engineRoom.state === "NEGOTIATING" &&
    engineRoom.turnCount < AGENT_NEGOTIATION_MAX_TURNS &&
    ticks < maxTicks
  ) {
    engineRoom = await runAgentNegotiationLlmTurn(engineRoom);
    ticks += 1;
    if (engineRoom.state !== "NEGOTIATING") {
      break;
    }
  }

  await saveEngineRoom(supabase, handshakeId, engineRoom);
}

export async function bootstrapAgentCoordinationForHandshake(
  supabase: SupabaseClient,
  handshakeId: string,
): Promise<void> {
  const handshake = await findMarketHandshakeById(supabase, handshakeId);
  if (!handshake || !isHandshakeEligibleForCoordinationBootstrap(handshake)) {
    return;
  }

  const row = await ensureAgentCoordinationRoomForHandshake(supabase, handshake);
  if (!row) {
    return;
  }

  const engineRoom = refreshAgentNegotiationPauseState(snapshotToEngineRoom(row));
  if (engineRoom.state === "NEGOTIATING") {
    await runAgentCoordinationTickLoop(supabase, handshakeId);
  }
}

/** Best-effort silent bootstrap — never fails parent handshake/trade flow. */
export async function tryBootstrapAgentCoordinationForHandshake(
  supabase: SupabaseClient,
  handshakeId: string,
): Promise<void> {
  try {
    await bootstrapAgentCoordinationForHandshake(supabase, handshakeId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("market_agent_coordination_rooms") ||
        error.message.includes("does not exist"))
    ) {
      return;
    }
    console.error(
      "[agent-coordination] bootstrap skipped:",
      error instanceof Error ? error.message : error,
    );
  }
}

export function scheduleAgentCoordinationBootstrap(
  supabase: SupabaseClient,
  handshakeId: string,
): void {
  void tryBootstrapAgentCoordinationForHandshake(supabase, handshakeId);
}

export async function startAgentCoordinationRoomForUser(
  supabase: SupabaseClient,
  userId: string,
  input: StartAgentNegotiationRoomInput,
  context?: {
    calendarBusyIntervals?: unknown;
    focusActive?: boolean;
    focusDeferMessageKo?: string;
  },
): Promise<AgentNegotiationRoomRecord> {
  const handshake = await assertHandshakeParticipant(supabase, input.handshakeId, userId);
  const existing = await findAgentCoordinationRoomRow(supabase, input.handshakeId);
  const peerDisplayName = await resolvePeerDisplayName(supabase, handshake, userId);
  if (existing) {
    return projectCoordinationRoomForViewer({
      row: existing,
      handshake,
      viewerUserId: userId,
      peerDisplayName,
    });
  }

  const meta = await resolveListingMeta(supabase, handshake, input);
  const created = mergeCalendarBusyIntoRoom(
    createAgentNegotiationRoom({
      handshakeId: input.handshakeId,
      threadId: meta.threadId ?? null,
      productTitle: meta.productTitle,
      priceLine: meta.priceLine,
      peerDisplayName,
      viewerRole: ENGINE_VIEWER_ROLE,
      availabilityPreset: meta.availabilityPreset,
      priceMinKrw: meta.priceMinKrw,
      priceMaxKrw: meta.priceMaxKrw,
      calendarBusyIntervals: meta.calendarBusyIntervals,
    }),
    meta.calendarBusyIntervals,
  );
  const saved = await saveEngineRoom(supabase, input.handshakeId, created, {
    product_title: meta.productTitle,
    price_line: meta.priceLine,
    thread_id: meta.threadId ?? null,
  });
  let projected = projectCoordinationRoomForViewer({
    row: saved,
    handshake,
    viewerUserId: userId,
    peerDisplayName,
  });
  if (context) {
    const engineRow = applyCoordinationClientContext(
      snapshotToEngineRoom(saved),
      context,
    );
    const focusSaved = await saveEngineRoom(supabase, input.handshakeId, engineRow);
    projected = projectCoordinationRoomForViewer({
      row: focusSaved,
      handshake,
      viewerUserId: userId,
      peerDisplayName,
    });
  }
  scheduleAgentCoordinationBootstrap(supabase, input.handshakeId);
  return projected;
}

export async function tickAgentCoordinationRoomForUser(
  supabase: SupabaseClient,
  userId: string,
  handshakeId: string,
  context?: {
    calendarBusyIntervals?: unknown;
    focusActive?: boolean;
    focusDeferMessageKo?: string;
  },
): Promise<AgentNegotiationRoomRecord> {
  const handshake = await assertHandshakeParticipant(supabase, handshakeId, userId);
  const row = await findAgentCoordinationRoomRow(supabase, handshakeId);
  if (!row) {
    throw new Error("coordination_not_found");
  }
  const peerDisplayName = await resolvePeerDisplayName(supabase, handshake, userId);
  const meta = await resolveListingMeta(supabase, handshake);
  let engineRoom = refreshAgentNegotiationPauseState(snapshotToEngineRoom(row));
  engineRoom = mergeListingSlotContext(engineRoom, meta);
  engineRoom = applyCoordinationClientContext(engineRoom, context);
  if (engineRoom.state === "PAUSED" || engineRoom.state === "WAITING_USER_INPUT") {
    const saved = await saveEngineRoom(supabase, handshakeId, engineRoom);
    return projectCoordinationRoomForViewer({
      row: saved,
      handshake,
      viewerUserId: userId,
      peerDisplayName,
    });
  }
  engineRoom = await runAgentNegotiationLlmTurn(engineRoom);
  const saved = await saveEngineRoom(supabase, handshakeId, engineRoom);
  return projectCoordinationRoomForViewer({
    row: saved,
    handshake,
    viewerUserId: userId,
    peerDisplayName,
  });
}

export async function syncAgentCoordinationFocusForUser(
  supabase: SupabaseClient,
  userId: string,
  handshakeId: string,
  input: {
    focusActive: boolean;
    focusDeferMessageKo: string;
    calendarBusyIntervals?: unknown;
  },
): Promise<AgentNegotiationRoomRecord> {
  const handshake = await assertHandshakeParticipant(supabase, handshakeId, userId);
  const row = await findAgentCoordinationRoomRow(supabase, handshakeId);
  if (!row) {
    throw new Error("coordination_not_found");
  }
  const peerDisplayName = await resolvePeerDisplayName(supabase, handshake, userId);
  const meta = await resolveListingMeta(supabase, handshake);
  let engineRoom = refreshAgentNegotiationPauseState(snapshotToEngineRoom(row));
  engineRoom = mergeListingSlotContext(engineRoom, meta);
  engineRoom = applyCoordinationClientContext(engineRoom, input);
  const saved = await saveEngineRoom(supabase, handshakeId, engineRoom);
  return projectCoordinationRoomForViewer({
    row: saved,
    handshake,
    viewerUserId: userId,
    peerDisplayName,
  });
}

export async function submitAgentCoordinationSlotForUser(
  supabase: SupabaseClient,
  userId: string,
  handshakeId: string,
  slotKey: AgentNegotiationSlotKey,
  valueKo: string,
): Promise<AgentNegotiationRoomRecord> {
  const handshake = await assertHandshakeParticipant(supabase, handshakeId, userId);
  const row = await findAgentCoordinationRoomRow(supabase, handshakeId);
  if (!row) {
    throw new Error("coordination_not_found");
  }
  const viewerRole = resolveViewerMarketRole({
    viewerUserId: userId,
    seekingUserId: handshake.seekingUserId,
    listingUserId: handshake.listingUserId,
  });
  const peerDisplayName = await resolvePeerDisplayName(supabase, handshake, userId);
  const projected = projectCoordinationRoomForViewer({
    row,
    handshake,
    viewerUserId: userId,
    peerDisplayName,
  });
  const question = projected.pendingQuestion;
  if (!question || question.slotKey !== slotKey) {
    throw new Error("slot_not_pending");
  }
  if (viewerRole && question.ownerRole !== viewerRole) {
    throw new Error("slot_owner_only");
  }

  const engineRoom = snapshotToEngineRoom(row);
  const answered = answerAgentNegotiationSlot(engineRoom, slotKey, valueKo);
  const saved = await saveEngineRoom(supabase, handshakeId, answered);
  return projectCoordinationRoomForViewer({
    row: saved,
    handshake,
    viewerUserId: userId,
    peerDisplayName,
  });
}

export async function approveAgentCoordinationRoomForUser(
  supabase: SupabaseClient,
  userId: string,
  handshakeId: string,
): Promise<AgentNegotiationRoomRecord> {
  const handshake = await assertHandshakeParticipant(supabase, handshakeId, userId);
  const row = await findAgentCoordinationRoomRow(supabase, handshakeId);
  if (!row) {
    throw new Error("coordination_not_found");
  }
  if (row.state !== "AGREED" || !row.proposal) {
    throw new Error("proposal_not_ready");
  }
  const peerDisplayName = await resolvePeerDisplayName(supabase, handshake, userId);
  const viewerRole = resolveViewerMarketRole({
    viewerUserId: userId,
    seekingUserId: handshake.seekingUserId,
    listingUserId: handshake.listingUserId,
  });
  if (!viewerRole) {
    throw new Error("forbidden");
  }

  const alreadyApproved =
    (viewerRole === "seeking" && row.seeking_approved_at) ||
    (viewerRole === "listing" && row.listing_approved_at);
  if (alreadyApproved && row.state === "AGREED") {
    return projectCoordinationRoomForViewer({
      row,
      handshake,
      viewerUserId: userId,
      peerDisplayName,
    });
  }

  const now = new Date().toISOString();
  const seekingApprovedAt =
    viewerRole === "seeking" ? now : row.seeking_approved_at;
  const listingApprovedAt =
    viewerRole === "listing" ? now : row.listing_approved_at;

  const log = Array.isArray(row.log_json) ? [...row.log_json] : [];
  if (viewerRole === "seeking" && !row.seeking_approved_at) {
    log.push({
      type: "system",
      text: "구매자가 조율안을 승인했어요.",
      atIso: now,
    });
  }
  if (viewerRole === "listing" && !row.listing_approved_at) {
    log.push({
      type: "system",
      text: "판매자가 조율안을 승인했어요.",
      atIso: now,
    });
  }

  let engineRoom = snapshotToEngineRoom({
    ...row,
    log_json: log,
    seeking_approved_at: seekingApprovedAt,
    listing_approved_at: listingApprovedAt,
  });

  if (seekingApprovedAt && listingApprovedAt) {
    engineRoom = approveAgentNegotiationProposal(engineRoom);
    await commitAgentCoordinationApprovalToHandshake(
      supabase,
      handshake,
      engineRoom.proposal,
    );
  }

  const saved = await upsertAgentCoordinationRow(supabase, handshakeId, {
    handshake_id: handshakeId,
    ...engineRoomToPatch(engineRoom),
    log_json: engineRoom.log,
    seeking_approved_at: seekingApprovedAt,
    listing_approved_at: listingApprovedAt,
    product_title: row.product_title,
    price_line: row.price_line,
    thread_id: row.thread_id,
  });

  return projectCoordinationRoomForViewer({
    row: saved,
    handshake,
    viewerUserId: userId,
    peerDisplayName,
  });
}
