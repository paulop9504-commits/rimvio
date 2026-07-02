import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import {
  DEFAULT_MARKET_AVAILABILITY_PRESET,
  readMarketAvailabilityPreset,
  type MarketAvailabilityPreset,
} from "@/lib/globe/market/market-availability-preset";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import {
  formatMarketTradeDateLabelKo,
  generateMarketTradeDateCandidates,
  generateMarketTradeTimeSlotsForDate,
  toMarketTradeDateKey,
} from "@/lib/globe/market/market-trade-schedule";

export type CalendarBusyInterval = {
  startMs: number;
  endMs: number;
};

export type AgentNegotiationSlotChipContext = {
  availabilityPreset?: MarketAvailabilityPreset;
  calendarBusyIntervals?: readonly CalendarBusyInterval[];
  priceMinKrw?: number | null;
  priceMaxKrw?: number | null;
};

const MEET_SLOT_DURATION_MS = 60 * 60 * 1000;
const DEFAULT_BUSY_DURATION_MS = 60 * 60 * 1000;
const CHIP_COUNT = 3;

function formatKrw(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatHourMinuteKo(hour: number, minute: number): string {
  if (minute === 0) {
    if (hour >= 5 && hour < 12) {
      return `오전 ${hour}시`;
    }
    if (hour === 12) {
      return "오후 12시";
    }
    if (hour > 12 && hour < 18) {
      return `오후 ${hour - 12}시`;
    }
    if (hour >= 18 && hour < 22) {
      return `저녁 ${hour - 12}시`;
    }
    if (hour >= 22 || hour < 5) {
      return `밤 ${hour > 12 ? hour - 12 : hour}시`;
    }
    return `오후 ${hour - 12}시`;
  }
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  if (hour >= 5 && hour < 12) {
    return `오전 ${hh}:${mm}`;
  }
  if (hour < 18) {
    const displayHour = hour > 12 ? hour - 12 : hour;
    return minute === 0
      ? `오후 ${displayHour}시`
      : `오후 ${displayHour}:${String(minute).padStart(2, "0")}`;
  }
  return `저녁 ${hh}:${mm}`;
}

export function formatAgentNegotiationMeetTimeChipKo(
  meetAtIso: string,
  now = new Date(),
): string {
  const at = new Date(meetAtIso);
  if (!Number.isFinite(at.getTime())) {
    return meetAtIso;
  }
  const dateKey = toMarketTradeDateKey(at);
  const dateLabel = formatMarketTradeDateLabelKo(dateKey, now);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][at.getDay()] ?? "";
  const prefix =
    dateLabel === "오늘" || dateLabel === "내일" || dateLabel === "모레"
      ? dateLabel
      : `${weekday}요일`;
  return `${prefix} ${formatHourMinuteKo(at.getHours(), at.getMinutes())}`;
}

export function extractCalendarBusyIntervalsFromOverlayRows(
  rows: readonly UnifiedCalendarOverlayRow[],
  defaultDurationMs = DEFAULT_BUSY_DURATION_MS,
): CalendarBusyInterval[] {
  const intervals: CalendarBusyInterval[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const startMs = row.event.startMs;
    if (!Number.isFinite(startMs)) {
      continue;
    }
    const key = `${startMs}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    intervals.push({
      startMs,
      endMs: startMs + defaultDurationMs,
    });
  }
  return intervals.sort((left, right) => left.startMs - right.startMs);
}

export function isMeetSlotConflictFree(
  meetAtIso: string,
  busyIntervals: readonly CalendarBusyInterval[],
  durationMs = MEET_SLOT_DURATION_MS,
): boolean {
  const start = new Date(meetAtIso).getTime();
  if (!Number.isFinite(start)) {
    return false;
  }
  const end = start + durationMs;
  return !busyIntervals.some(
    (busy) => start < busy.endMs && end > busy.startMs,
  );
}

function shiftMeetAtIso(meetAtIso: string, deltaMinutes: number): string | null {
  const at = new Date(meetAtIso);
  if (!Number.isFinite(at.getTime())) {
    return null;
  }
  at.setMinutes(at.getMinutes() + deltaMinutes, 0, 0);
  return at.toISOString();
}

function collectMeetCandidates(
  preset: MarketAvailabilityPreset,
  busyIntervals: readonly CalendarBusyInterval[],
  now: Date,
): string[] {
  const dateKeys = generateMarketTradeDateCandidates(preset, now, 5);
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const dateKey of dateKeys) {
    const slots = generateMarketTradeTimeSlotsForDate(preset, dateKey, now);
    for (const slotIso of slots) {
      const variants = [slotIso];
      const shiftedEarlier = shiftMeetAtIso(slotIso, -30);
      const shiftedLater = shiftMeetAtIso(slotIso, 30);
      if (shiftedEarlier) {
        variants.unshift(shiftedEarlier);
      }
      if (shiftedLater) {
        variants.push(shiftedLater);
      }
      for (const variant of variants) {
        if (seen.has(variant)) {
          continue;
        }
        if (!isMeetSlotConflictFree(variant, busyIntervals)) {
          continue;
        }
        seen.add(variant);
        candidates.push(variant);
        if (candidates.length >= CHIP_COUNT) {
          return candidates;
        }
      }
    }
  }
  return candidates;
}

export function buildMeetTimeSlotChips(
  context: AgentNegotiationSlotChipContext = {},
  now = new Date(),
): string[] {
  const preset = readMarketAvailabilityPreset(
    context.availabilityPreset ?? DEFAULT_MARKET_AVAILABILITY_PRESET,
  );
  const busyIntervals = context.calendarBusyIntervals ?? [];
  const candidates = collectMeetCandidates(preset, busyIntervals, now);
  if (candidates.length > 0) {
    return candidates.map((iso) => formatAgentNegotiationMeetTimeChipKo(iso, now));
  }
  const fallback = generateMarketTradeDateCandidates(preset, now, 3);
  const labels: string[] = [];
  for (const dateKey of fallback) {
    const slots = generateMarketTradeTimeSlotsForDate(preset, dateKey, now);
    const first = slots[0];
    if (first) {
      labels.push(formatAgentNegotiationMeetTimeChipKo(first, now));
    }
    if (labels.length >= CHIP_COUNT) {
      break;
    }
  }
  return labels.length > 0
    ? labels
    : ["토요일 오후 3시", "일요일 오전 11시", "평일 저녁 7시"];
}

function resolveListingAnchorPrice(context: AgentNegotiationSlotChipContext): number | null {
  if (context.priceMaxKrw != null && context.priceMaxKrw > 0) {
    return context.priceMaxKrw;
  }
  if (context.priceMinKrw != null && context.priceMinKrw > 0) {
    return context.priceMinKrw;
  }
  return null;
}

export function buildPriceSlotChips(
  viewerRole: MarketIntentRole,
  parsedListingPrice: number | null,
  context: AgentNegotiationSlotChipContext = {},
): string[] {
  const anchor =
    viewerRole === "listing"
      ? (context.priceMinKrw ?? parsedListingPrice ?? resolveListingAnchorPrice(context))
      : (context.priceMaxKrw ?? parsedListingPrice ?? resolveListingAnchorPrice(context));

  if (viewerRole === "listing") {
    if (anchor != null && anchor > 0) {
      return [
        formatKrw(Math.round(anchor * 0.85)),
        formatKrw(Math.round(anchor * 0.9)),
        formatKrw(Math.round(anchor * 0.95)),
      ];
    }
    return ["65만원", "70만원", "75만원"];
  }

  if (anchor != null && anchor > 0) {
    const floor =
      context.priceMinKrw != null && context.priceMinKrw > 0
        ? context.priceMinKrw
        : Math.round(anchor * 0.9);
    return [
      formatKrw(Math.round(floor)),
      formatKrw(Math.round(anchor * 0.95)),
      formatKrw(anchor),
    ];
  }
  return ["70만원", "75만원", "80만원"];
}

export function summarizeCalendarBusyForPrompt(
  busyIntervals: readonly CalendarBusyInterval[],
  now = new Date(),
): string[] {
  return busyIntervals
    .filter((interval) => interval.endMs >= now.getTime())
    .slice(0, 8)
    .map((interval) => {
      const start = formatAgentNegotiationMeetTimeChipKo(new Date(interval.startMs).toISOString(), now);
      const endAt = new Date(interval.endMs);
      const end = formatHourMinuteKo(endAt.getHours(), endAt.getMinutes());
      return `${start}~${end} 바쁨`;
    });
}
