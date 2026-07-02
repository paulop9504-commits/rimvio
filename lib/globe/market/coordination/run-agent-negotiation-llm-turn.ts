import {
  applyAgentNegotiationLlmTurn,
  parseAgentNegotiationLlmTurn,
} from "@/lib/globe/market/coordination/apply-agent-negotiation-llm-turn";
import { advanceAgentNegotiationTurn } from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import type { AgentNegotiationRoomRecord } from "@/lib/globe/market/coordination/agent-negotiation-types";
import { summarizeCalendarBusyForPrompt } from "@/lib/globe/market/coordination/agent-negotiation-slot-chips";
import { marketAvailabilityPresetLabelKo } from "@/lib/globe/market/market-availability-preset";
import { callLlmTextJson } from "@/lib/llm/text-llm-client";

function buildNegotiationContext(room: AgentNegotiationRoomRecord): string {
  const recentLog = room.log.slice(-10).map((entry) => {
    if (entry.type === "agent") {
      return entry.text;
    }
    if (entry.type === "user_injected") {
      return `${entry.labelKo}: ${entry.valueKo}`;
    }
    return entry.text;
  });

  const missingMeetTime = !room.filledSlots.meet_time_label;
  const busySummary = summarizeCalendarBusyForPrompt(
    room.calendarBusyIntervals ?? [],
  );
  const scheduleContext =
    missingMeetTime && (room.availabilityPreset || busySummary.length > 0)
      ? {
          listingAvailabilityPreset: room.availabilityPreset
            ? marketAvailabilityPresetLabelKo(room.availabilityPreset)
            : null,
          calendarBusyKo: busySummary,
          meetTimeChipHint:
            "Prefer request_slot meet_time_label; chips are generated deterministically from preset + calendar.",
        }
      : undefined;

  return JSON.stringify(
    {
      productTitle: room.productTitle,
      priceLine: room.priceLine,
      priceMinKrw: room.priceMinKrw ?? null,
      priceMaxKrw: room.priceMaxKrw ?? null,
      turnCount: room.turnCount,
      filledSlots: room.filledSlots,
      recentLog,
      scheduleContext,
    },
    null,
    2,
  );
}

const SYSTEM_PROMPT = `You are a trade coordination engine for a Korean C2C marketplace.
Return JSON only.

Schema:
{
  "action": "message" | "request_slot" | "propose" | "stuck",
  "speakerRole": "seeking" | "listing",
  "messageKo": "short Korean line for the agent bubble",
  "slotKey": "min_price_krw" | "max_price_krw" | "meet_time_label",
  "questionKo": "when request_slot",
  "chips": ["optional quick answers"],
  "proposal": { "priceKo": "", "meetTimeKo": "", "meetPlaceKo": "" }
}

Rules:
- Never invent prices or times not grounded in filledSlots or priceLine.
- If price bounds are missing, use request_slot (min_price_krw → listing, max_price_krw → seeking).
- If meet_time_label is missing, request_slot before propose. scheduleContext lists listing availability + calendar busy windows when present.
- propose only when price + meet time are known from filledSlots.
- Keep messageKo under 80 Korean characters.
- Alternate seeking/listing agents naturally.
- No commitments beyond negotiation; no payment or meet confirmation.`;

export async function runAgentNegotiationLlmTurn(
  room: AgentNegotiationRoomRecord,
): Promise<AgentNegotiationRoomRecord> {
  if (room.state !== "NEGOTIATING") {
    return room;
  }

  const raw = await callLlmTextJson({
    systemPrompt: SYSTEM_PROMPT,
    userText: buildNegotiationContext(room),
    temperature: 0.35,
  });

  if (!raw) {
    return advanceAgentNegotiationTurn(room);
  }

  const parsed = parseAgentNegotiationLlmTurn(raw);
  if (!parsed) {
    return advanceAgentNegotiationTurn(room);
  }

  return applyAgentNegotiationLlmTurn(room, parsed);
}
