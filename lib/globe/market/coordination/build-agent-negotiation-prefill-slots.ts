import {
  buildMeetTimeSlotChips,
  formatAgentNegotiationMeetTimeChipKo,
  type AgentNegotiationSlotChipContext,
} from "@/lib/globe/market/coordination/agent-negotiation-slot-chips";
import type { AgentNegotiationSlotKey } from "@/lib/globe/market/coordination/agent-negotiation-types";
import { DEFAULT_MARKET_AVAILABILITY_PRESET } from "@/lib/globe/market/market-availability-preset";

function formatKrw(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function parsePriceLineKrw(priceLine: string): number | null {
  const digits = priceLine.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export type BuildAgentNegotiationPrefillSlotsInput = AgentNegotiationSlotChipContext & {
  priceLine?: string;
  preferredMeetAtIso?: string | null;
};

function prefillPriceSlots(
  input: BuildAgentNegotiationPrefillSlotsInput,
): Partial<Record<"min_price_krw" | "max_price_krw", string>> {
  const linePrice = input.priceLine?.trim()
    ? parsePriceLineKrw(input.priceLine)
    : null;
  const minKrw =
    input.priceMinKrw != null && input.priceMinKrw > 0 ? input.priceMinKrw : null;
  const maxKrw =
    input.priceMaxKrw != null && input.priceMaxKrw > 0 ? input.priceMaxKrw : null;

  if (minKrw != null && maxKrw != null) {
    if (minKrw === maxKrw) {
      const label = formatKrw(minKrw);
      return { min_price_krw: label, max_price_krw: label };
    }
    return { min_price_krw: formatKrw(minKrw) };
  }

  if (minKrw != null) {
    const out: Partial<Record<"min_price_krw" | "max_price_krw", string>> = {
      min_price_krw: formatKrw(minKrw),
    };
    if (linePrice != null && linePrice === minKrw) {
      out.max_price_krw = formatKrw(linePrice);
    }
    return out;
  }

  if (maxKrw != null) {
    const label = formatKrw(maxKrw);
    return { min_price_krw: label, max_price_krw: label };
  }

  if (linePrice != null) {
    const label = formatKrw(linePrice);
    return { min_price_krw: label, max_price_krw: label };
  }

  return {};
}

function prefillMeetTimeSlot(
  input: BuildAgentNegotiationPrefillSlotsInput,
  now: Date,
): string | undefined {
  const preferred = input.preferredMeetAtIso?.trim();
  if (preferred) {
    return formatAgentNegotiationMeetTimeChipKo(preferred, now);
  }

  const preset = input.availabilityPreset;
  if (!preset || preset === DEFAULT_MARKET_AVAILABILITY_PRESET) {
    return undefined;
  }

  const chips = buildMeetTimeSlotChips(
    {
      availabilityPreset: preset,
      calendarBusyIntervals: input.calendarBusyIntervals,
      priceMinKrw: input.priceMinKrw,
      priceMaxKrw: input.priceMaxKrw,
    },
    now,
  );
  return chips[0];
}

/** High-confidence slot values from listing + handshake — never invent. */
export function buildAgentNegotiationPrefillSlots(
  input: BuildAgentNegotiationPrefillSlotsInput,
  now = new Date(),
): Partial<Record<AgentNegotiationSlotKey, string>> {
  const slots: Partial<Record<AgentNegotiationSlotKey, string>> = {
    ...prefillPriceSlots(input),
  };

  const meetTime = prefillMeetTimeSlot(input, now);
  if (meetTime) {
    slots.meet_time_label = meetTime;
  }

  return slots;
}

export function countAgentNegotiationPrefillSlots(
  slots: Partial<Record<AgentNegotiationSlotKey, string>>,
): number {
  return (["min_price_krw", "max_price_krw", "meet_time_label"] as const).filter(
    (key) => Boolean(slots[key]?.trim()),
  ).length;
}
