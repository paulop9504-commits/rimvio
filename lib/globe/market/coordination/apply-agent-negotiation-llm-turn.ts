import type {
  AgentNegotiationProposal,
  AgentNegotiationRoomRecord,
} from "@/lib/globe/market/coordination/agent-negotiation-types";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import {
  AGENT_NEGOTIATION_MAX_TURNS,
  type AgentNegotiationLogEntry,
} from "@/lib/globe/market/coordination/agent-negotiation-types";
import {
  buildMeetTimeQuestion,
  buildPriceQuestion,
} from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import type { AgentNegotiationSlotKey } from "@/lib/globe/market/coordination/agent-negotiation-types";

function nowIso(): string {
  return new Date().toISOString();
}

export type AgentNegotiationLlmTurnResult = {
  action: "message" | "request_slot" | "propose" | "stuck";
  speakerRole: MarketIntentRole;
  messageKo?: string;
  slotKey?: AgentNegotiationSlotKey;
  questionKo?: string;
  chips?: string[];
  proposal?: AgentNegotiationProposal;
};

function agentLabel(role: MarketIntentRole): string {
  return role === "seeking" ? "구매 에이전트" : "판매 에이전트";
}

function parseListingPriceKrw(priceLine: string): number | null {
  const digits = priceLine.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

function pushAgentLogByRole(
  room: AgentNegotiationRoomRecord,
  role: MarketIntentRole,
  body: string,
): AgentNegotiationLogEntry {
  const side: "self" | "peer" =
    role === room.viewerRole ? "self" : "peer";
  return {
    type: "agent",
    side,
    role,
    text: `${agentLabel(role)}: ${body.trim()}`,
    atIso: nowIso(),
  };
}

function slotOwnerForKey(slotKey: AgentNegotiationSlotKey): MarketIntentRole {
  if (slotKey === "min_price_krw") {
    return "listing";
  }
  if (slotKey === "max_price_krw") {
    return "seeking";
  }
  return "seeking";
}

function hasPriceSlotFilled(room: AgentNegotiationRoomRecord): boolean {
  return Boolean(
    room.filledSlots.min_price_krw?.trim() ||
      room.filledSlots.max_price_krw?.trim(),
  );
}

function missingRequiredSlot(
  room: AgentNegotiationRoomRecord,
): AgentNegotiationSlotKey | null {
  if (!hasPriceSlotFilled(room)) {
    return "min_price_krw";
  }
  if (!room.filledSlots.meet_time_label?.trim()) {
    return "meet_time_label";
  }
  return null;
}

function isSlotAlreadyFilled(
  room: AgentNegotiationRoomRecord,
  slotKey: AgentNegotiationSlotKey,
): boolean {
  if (slotKey === "min_price_krw" || slotKey === "max_price_krw") {
    return hasPriceSlotFilled(room);
  }
  return Boolean(room.filledSlots.meet_time_label?.trim());
}

function buildSlotQuestion(
  room: AgentNegotiationRoomRecord,
  slotKey: AgentNegotiationSlotKey,
  questionKo?: string,
  chips?: string[],
) {
  const listingPrice = parseListingPriceKrw(room.priceLine);
  const owner = slotOwnerForKey(slotKey);
  const context = {
    availabilityPreset: room.availabilityPreset,
    calendarBusyIntervals: room.calendarBusyIntervals,
    priceMinKrw: room.priceMinKrw,
    priceMaxKrw: room.priceMaxKrw,
  };
  const base =
    slotKey === "meet_time_label"
      ? buildMeetTimeQuestion(owner, context)
      : buildPriceQuestion(owner, listingPrice, context);
  return {
    slotKey,
    questionKo: questionKo?.trim() || base.questionKo,
    chips: chips?.length ? chips : base.chips,
    ownerRole: base.ownerRole,
  };
}

export function parseAgentNegotiationLlmTurn(
  raw: string,
): AgentNegotiationLlmTurnResult | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const action = parsed.action;
    const speakerRole = parsed.speakerRole;
    if (
      action !== "message" &&
      action !== "request_slot" &&
      action !== "propose" &&
      action !== "stuck"
    ) {
      return null;
    }
    if (speakerRole !== "seeking" && speakerRole !== "listing") {
      return null;
    }
    const slotKey = parsed.slotKey;
    const normalizedSlotKey =
      slotKey === "min_price_krw" ||
      slotKey === "max_price_krw" ||
      slotKey === "meet_time_label"
        ? slotKey
        : undefined;
    const proposal = parsed.proposal as AgentNegotiationProposal | undefined;
    return {
      action,
      speakerRole,
      messageKo:
        typeof parsed.messageKo === "string" ? parsed.messageKo.trim() : undefined,
      slotKey: normalizedSlotKey,
      questionKo:
        typeof parsed.questionKo === "string" ? parsed.questionKo.trim() : undefined,
      chips: Array.isArray(parsed.chips)
        ? parsed.chips.filter((chip): chip is string => typeof chip === "string")
        : undefined,
      proposal:
        proposal &&
        typeof proposal.priceKo === "string" &&
        typeof proposal.meetTimeKo === "string" &&
        typeof proposal.meetPlaceKo === "string"
          ? proposal
          : undefined,
    };
  } catch {
    return null;
  }
}

export function applyAgentNegotiationLlmTurn(
  room: AgentNegotiationRoomRecord,
  turn: AgentNegotiationLlmTurnResult,
): AgentNegotiationRoomRecord {
  const nextTurn = room.turnCount + 1;
  const log = [...room.log];

  if (nextTurn > AGENT_NEGOTIATION_MAX_TURNS || turn.action === "stuck") {
    return {
      ...room,
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

  if (turn.action === "request_slot") {
    const missing = turn.slotKey ?? missingRequiredSlot(room);
    if (!missing) {
      return applyAgentNegotiationLlmTurn(room, {
        action: "message",
        speakerRole: turn.speakerRole,
        messageKo: turn.messageKo ?? "조건을 정리해 볼게요.",
      });
    }
    if (isSlotAlreadyFilled(room, missing)) {
      return applyAgentNegotiationLlmTurn(room, {
        action: "message",
        speakerRole: turn.speakerRole,
        messageKo: turn.messageKo ?? "이미 맞춰진 조건을 확인했어요.",
      });
    }
    if (turn.messageKo) {
      log.push(pushAgentLogByRole(room, turn.speakerRole, turn.messageKo));
    }
    return {
      ...room,
      log,
      state: "WAITING_USER_INPUT",
      pendingQuestion: buildSlotQuestion(
        room,
        missing,
        turn.questionKo,
        turn.chips,
      ),
      waitingSinceIso: nowIso(),
      turnCount: nextTurn,
      updatedAtIso: nowIso(),
    };
  }

  if (turn.action === "propose") {
    const missing = missingRequiredSlot(room);
    if (missing || !turn.proposal) {
      return applyAgentNegotiationLlmTurn(room, {
        action: "request_slot",
        speakerRole: turn.speakerRole,
        slotKey: missing ?? "min_price_krw",
        messageKo: "확인이 필요한 정보가 있어요.",
      });
    }
    if (turn.messageKo) {
      log.push(pushAgentLogByRole(room, turn.speakerRole, turn.messageKo));
    }
    log.push(
      pushAgentLogByRole(room, turn.speakerRole === "seeking" ? "listing" : "seeking", "이 조건으로 진행할게요."),
    );
    return {
      ...room,
      log,
      state: "AGREED",
      proposal: turn.proposal,
      pendingQuestion: null,
      waitingSinceIso: null,
      turnCount: nextTurn,
      updatedAtIso: nowIso(),
    };
  }

  const message =
    turn.messageKo?.trim() ||
    "조건을 맞춰 보고 있어요.";
  log.push(pushAgentLogByRole(room, turn.speakerRole, message));
  return {
    ...room,
    log,
    state: "NEGOTIATING",
    turnCount: nextTurn,
    updatedAtIso: nowIso(),
  };
}
