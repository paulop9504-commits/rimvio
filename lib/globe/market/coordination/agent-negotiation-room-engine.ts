import {
  AGENT_NEGOTIATION_MAX_TURNS,
  AGENT_NEGOTIATION_SLOT_TIMEOUT_MS,
  type AgentNegotiationLogEntry,
  type AgentNegotiationRoomRecord,
  type AgentNegotiationSlotKey,
  type AgentNegotiationState,
  type AgentSlotQuestion,
  type StartAgentNegotiationRoomInput,
} from "@/lib/globe/market/coordination/agent-negotiation-types";
import {
  buildMeetTimeSlotChips,
  buildPriceSlotChips,
  type AgentNegotiationSlotChipContext,
} from "@/lib/globe/market/coordination/agent-negotiation-slot-chips";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { invertMarketIntentRole } from "@/lib/globe/market/market-intent-role";

function nowIso(): string {
  return new Date().toISOString();
}

function agentLabel(side: "self" | "peer", viewerRole: MarketIntentRole): string {
  if (side === "self") {
    return viewerRole === "seeking" ? "구매 에이전트" : "판매 에이전트";
  }
  return viewerRole === "seeking" ? "판매 에이전트" : "구매 에이전트";
}

function pushAgentLog(
  room: AgentNegotiationRoomRecord,
  side: "self" | "peer",
  text: string,
): AgentNegotiationLogEntry {
  const role = side === "self" ? room.viewerRole : invertMarketIntentRole(room.viewerRole);
  return {
    type: "agent",
    side,
    role,
    text: `${agentLabel(side, room.viewerRole)}: ${text}`,
    atIso: nowIso(),
  };
}

function parseListingPriceKrw(priceLine: string): number | null {
  const digits = priceLine.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

function formatKrw(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function slotChipContextFromRoom(
  room: Pick<
    AgentNegotiationRoomRecord,
    "availabilityPreset" | "calendarBusyIntervals" | "priceMinKrw" | "priceMaxKrw"
  >,
): AgentNegotiationSlotChipContext {
  return {
    availabilityPreset: room.availabilityPreset,
    calendarBusyIntervals: room.calendarBusyIntervals,
    priceMinKrw: room.priceMinKrw,
    priceMaxKrw: room.priceMaxKrw,
  };
}

export function buildPriceQuestion(
  viewerRole: MarketIntentRole,
  listingPrice: number | null,
  context: AgentNegotiationSlotChipContext = {},
): AgentSlotQuestion {
  if (viewerRole === "listing") {
    return {
      slotKey: "min_price_krw",
      questionKo: "최소 얼마까지 가능해요?",
      chips: buildPriceSlotChips("listing", listingPrice, context),
      ownerRole: "listing",
    };
  }
  return {
    slotKey: "max_price_krw",
    questionKo: "최대 얼마까지 괜찮아요?",
    chips: buildPriceSlotChips("seeking", listingPrice, context),
    ownerRole: "seeking",
  };
}

export function buildMeetTimeQuestion(
  viewerRole: MarketIntentRole,
  context: AgentNegotiationSlotChipContext = {},
  now = new Date(),
): AgentSlotQuestion {
  return {
    slotKey: "meet_time_label",
    questionKo: "만날 수 있는 시간을 골라 주세요",
    chips: buildMeetTimeSlotChips(context, now),
    ownerRole: viewerRole,
  };
}

function injectedLabel(room: AgentNegotiationRoomRecord, slotKey: AgentNegotiationSlotKey): string {
  if (slotKey === "min_price_krw") {
    return "판매자가 답함";
  }
  if (slotKey === "max_price_krw") {
    return "구매자가 답함";
  }
  return room.viewerRole === "seeking" ? "구매자가 답함" : "판매자가 답함";
}

export function createAgentNegotiationRoom(
  input: StartAgentNegotiationRoomInput,
): AgentNegotiationRoomRecord {
  const at = nowIso();
  return {
    handshakeId: input.handshakeId,
    threadId: input.threadId,
    productTitle: input.productTitle.trim() || "거래",
    priceLine: input.priceLine.trim(),
    peerDisplayName: input.peerDisplayName.trim() || "상대",
    viewerRole: input.viewerRole,
    availabilityPreset: input.availabilityPreset,
    calendarBusyIntervals: input.calendarBusyIntervals,
    priceMinKrw: input.priceMinKrw,
    priceMaxKrw: input.priceMaxKrw,
    state: "NEGOTIATING",
    log: [
      {
        type: "system",
        text: "AI 조율을 시작했어요. 이 창은 읽기 전용이에요.",
        atIso: at,
      },
    ],
    filledSlots: {},
    pendingQuestion: null,
    proposal: null,
    turnCount: 0,
    waitingSinceIso: null,
    seekingApprovedAtIso: null,
    listingApprovedAtIso: null,
    createdAtIso: at,
    updatedAtIso: at,
  };
}

export function refreshAgentNegotiationPauseState(
  room: AgentNegotiationRoomRecord,
): AgentNegotiationRoomRecord {
  if (room.state !== "WAITING_USER_INPUT" || !room.waitingSinceIso) {
    return room;
  }
  const elapsed = Date.now() - new Date(room.waitingSinceIso).getTime();
  if (elapsed < AGENT_NEGOTIATION_SLOT_TIMEOUT_MS) {
    return room;
  }
  return {
    ...room,
    state: "PAUSED",
    updatedAtIso: nowIso(),
    log: [
      ...room.log,
      {
        type: "system",
        text: "답변이 없어 잠시 멈췄어요. 슬롯을 채우면 이어갈 수 있어요.",
        atIso: nowIso(),
      },
    ],
  };
}

export function advanceAgentNegotiationTurn(
  room: AgentNegotiationRoomRecord,
): AgentNegotiationRoomRecord {
  const paused = refreshAgentNegotiationPauseState(room);
  if (
    paused.state === "WAITING_USER_INPUT" ||
    paused.state === "AGREED" ||
    paused.state === "STUCK" ||
    paused.state === "APPROVED" ||
    paused.state === "PAUSED"
  ) {
    return paused;
  }

  const listingPrice = parseListingPriceKrw(paused.priceLine);
  const slotContext = slotChipContextFromRoom(paused);
  const nextTurn = paused.turnCount + 1;
  const log = [...paused.log];
  let state: AgentNegotiationState = paused.state;
  let pendingQuestion = paused.pendingQuestion;
  let waitingSinceIso = paused.waitingSinceIso;
  let proposal = paused.proposal;

  if (nextTurn > AGENT_NEGOTIATION_MAX_TURNS) {
    return {
      ...paused,
      state: "STUCK",
      turnCount: nextTurn,
      updatedAtIso: nowIso(),
      log: [
        ...log,
        {
          type: "system",
          text: "합의점을 찾지 못했어요. 직접 대화로 이어가 보세요.",
          atIso: nowIso(),
        },
      ],
    };
  }

  if (nextTurn === 1) {
    const offer =
      paused.viewerRole === "seeking" && listingPrice
        ? formatKrw(Math.round(listingPrice * 0.92))
        : paused.priceLine || "제안가 확인 중";
    log.push(pushAgentLog(paused, "self", `${offer} 제안드립니다.`));
  } else if (nextTurn === 2) {
    const counter =
      listingPrice != null ? formatKrw(listingPrice) : "조건 확인이 필요해요";
    log.push(pushAgentLog(paused, "peer", `${counter} 기준이에요.`));
  } else if (nextTurn === 3 && !paused.filledSlots.min_price_krw && !paused.filledSlots.max_price_krw) {
    log.push(pushAgentLog(paused, "self", "가격 확인이 필요해요."));
    pendingQuestion = buildPriceQuestion(paused.viewerRole, listingPrice, slotContext);
    state = "WAITING_USER_INPUT";
    waitingSinceIso = nowIso();
  } else if (nextTurn === 4) {
    const bound =
      paused.filledSlots.min_price_krw ??
      paused.filledSlots.max_price_krw ??
      paused.priceLine;
    log.push(pushAgentLog(paused, "peer", `${bound}이면 검토할 수 있어요.`));
  } else if (nextTurn === 5) {
    log.push(pushAgentLog(paused, "self", "만남 시간도 맞춰볼게요."));
  } else if (nextTurn === 6 && !paused.filledSlots.meet_time_label) {
    log.push(pushAgentLog(paused, "peer", "가능한 시간을 알려주세요."));
    pendingQuestion = buildMeetTimeQuestion(paused.viewerRole, slotContext);
    state = "WAITING_USER_INPUT";
    waitingSinceIso = nowIso();
  } else if (nextTurn >= 7) {
    const price =
      paused.filledSlots.min_price_krw ??
      paused.filledSlots.max_price_krw ??
      paused.priceLine;
    const meet = paused.filledSlots.meet_time_label ?? "시간 협의";
    proposal = {
      priceKo: price,
      meetTimeKo: meet,
      meetPlaceKo: "거래 장소는 약속 단계에서 확정",
    };
    log.push(pushAgentLog(paused, "self", "조건이 맞는 것 같아요."));
    log.push(pushAgentLog(paused, "peer", "이 조건으로 진행할게요."));
    state = "AGREED";
    pendingQuestion = null;
    waitingSinceIso = null;
  }

  return {
    ...paused,
    log,
    state,
    pendingQuestion,
    waitingSinceIso,
    proposal,
    turnCount: nextTurn,
    updatedAtIso: nowIso(),
  };
}

export function answerAgentNegotiationSlot(
  room: AgentNegotiationRoomRecord,
  slotKey: AgentNegotiationSlotKey,
  valueKo: string,
): AgentNegotiationRoomRecord {
  const trimmed = valueKo.trim();
  if (!trimmed || room.state === "APPROVED") {
    return room;
  }
  if (room.pendingQuestion?.slotKey !== slotKey) {
    return room;
  }

  const log: AgentNegotiationLogEntry[] = [
    ...room.log,
    {
      type: "user_injected",
      slotKey,
      labelKo: injectedLabel(room, slotKey),
      valueKo: trimmed,
      atIso: nowIso(),
    },
  ];

  return {
    ...room,
    log,
    filledSlots: { ...room.filledSlots, [slotKey]: trimmed },
    pendingQuestion: null,
    waitingSinceIso: null,
    state: "NEGOTIATING",
    updatedAtIso: nowIso(),
  };
}

export function approveAgentNegotiationProposal(
  room: AgentNegotiationRoomRecord,
): AgentNegotiationRoomRecord {
  if (room.state !== "AGREED" || !room.proposal) {
    return room;
  }
  return {
    ...room,
    state: "APPROVED",
    updatedAtIso: nowIso(),
    log: [
      ...room.log,
      {
        type: "system",
        text: "양쪽 모두 승인했어요. 이제 약속 단계로 넘어갈 수 있어요.",
        atIso: nowIso(),
      },
    ],
  };
}

export function recordAgentNegotiationPartyApproval(
  room: AgentNegotiationRoomRecord,
): AgentNegotiationRoomRecord {
  if (room.state !== "AGREED" || !room.proposal) {
    return room;
  }
  const now = nowIso();
  const seekingApprovedAt =
    room.viewerRole === "seeking" ? now : room.seekingApprovedAtIso;
  const listingApprovedAt =
    room.viewerRole === "listing" ? now : room.listingApprovedAtIso;
  const log = [...room.log];
  if (room.viewerRole === "seeking" && !room.seekingApprovedAtIso) {
    log.push({
      type: "system",
      text: "구매자가 조율안을 승인했어요.",
      atIso: now,
    });
  }
  if (room.viewerRole === "listing" && !room.listingApprovedAtIso) {
    log.push({
      type: "system",
      text: "판매자가 조율안을 승인했어요.",
      atIso: now,
    });
  }
  const next: AgentNegotiationRoomRecord = {
    ...room,
    seekingApprovedAtIso: seekingApprovedAt,
    listingApprovedAtIso: listingApprovedAt,
    log,
    updatedAtIso: now,
  };
  if (seekingApprovedAt && listingApprovedAt) {
    return approveAgentNegotiationProposal(next);
  }
  return next;
}

export function previewAgentNegotiationLog(
  room: AgentNegotiationRoomRecord,
): string {
  for (let index = room.log.length - 1; index >= 0; index -= 1) {
    const entry = room.log[index];
    if (entry.type === "agent") {
      return entry.text;
    }
    if (entry.type === "user_injected") {
      return `${entry.labelKo}: ${entry.valueKo}`;
    }
  }
  return room.productTitle;
}
