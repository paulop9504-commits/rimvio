export type MarketAvailabilityPreset =
  | "weekend_evening"
  | "weekend_day"
  | "weekday_afternoon"
  | "weekday_day"
  | "anytime";

export const DEFAULT_MARKET_AVAILABILITY_PRESET: MarketAvailabilityPreset = "anytime";

/** Wizard chip order — SSOT for listing place step. */
export const MARKET_AVAILABILITY_PRESET_ORDER: readonly MarketAvailabilityPreset[] = [
  "weekday_day",
  "weekday_afternoon",
  "weekend_day",
  "weekend_evening",
  "anytime",
];

export const MARKET_SCHEDULING_SLA_HOURS = 24;

export function readMarketAvailabilityPreset(raw: unknown): MarketAvailabilityPreset {
  if (
    raw === "weekend_evening" ||
    raw === "weekend_day" ||
    raw === "weekday_afternoon" ||
    raw === "weekday_day" ||
    raw === "anytime"
  ) {
    return raw;
  }
  // Legacy stored values (pre v1.1 presets)
  if (raw === "weeknight") {
    return "weekday_afternoon";
  }
  if (raw === "flex") {
    return "weekday_afternoon";
  }
  return DEFAULT_MARKET_AVAILABILITY_PRESET;
}

function skipWeekend(d: Date): Date {
  const next = new Date(d);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function nextDayAt(base: Date, dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function advanceToWeekend(d: Date): Date {
  const next = new Date(d);
  while (next.getDay() !== 6 && next.getDay() !== 0) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function nextWeekendSlot(base: Date, weekendWeekOffset: number, hour: number): Date {
  let d = new Date(base);
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  d = advanceToWeekend(d);
  if (weekendWeekOffset > 0) {
    d.setDate(d.getDate() + 7 * weekendWeekOffset);
  }
  return d;
}

function nextWeekdaySlots(
  base: Date,
  hours: readonly number[],
): string[] {
  const slots: string[] = [];
  let dayOffset = 1;
  for (const hour of hours) {
    let candidate = nextDayAt(base, dayOffset, hour);
    candidate = skipWeekend(candidate);
    if (candidate.getTime() <= base.getTime()) {
      candidate = skipWeekend(nextDayAt(base, dayOffset + 1, hour));
    }
    slots.push(candidate.toISOString());
    dayOffset += 1;
  }
  return slots;
}

function nextWeekendSlots(
  base: Date,
  hours: readonly number[],
): string[] {
  return hours.map((hour, index) =>
    nextWeekendSlot(base, index > 0 ? 1 : 0, hour).toISOString(),
  );
}

/** Deterministic slots from listing availability preset (Pull scheduling SSOT). */
export function generateMarketTradeScheduleCandidates(
  preset: MarketAvailabilityPreset = DEFAULT_MARKET_AVAILABILITY_PRESET,
  now = new Date(),
): string[] {
  if (preset === "weekend_evening") {
    return nextWeekendSlots(now, [18, 19, 20]);
  }

  if (preset === "weekend_day") {
    return nextWeekendSlots(now, [13, 14, 15]);
  }

  if (preset === "weekday_afternoon") {
    return nextWeekdaySlots(now, [13, 14, 15]);
  }

  if (preset === "weekday_day") {
    return nextWeekdaySlots(now, [11, 12, 13]);
  }

  // anytime — mixed sample so buyer/seller see weekday + weekend variety
  return [
    skipWeekend(nextDayAt(now, 1, 11)).toISOString(),
    skipWeekend(nextDayAt(now, 2, 14)).toISOString(),
    nextWeekendSlot(now, 0, 18).toISOString(),
  ];
}

export function marketAvailabilityPresetLabelKo(preset: MarketAvailabilityPreset): string {
  switch (preset) {
    case "weekend_evening":
      return "주말 오후";
    case "weekend_day":
      return "주말 오전";
    case "weekday_afternoon":
      return "주중 오후";
    case "weekday_day":
      return "주중 오전";
    case "anytime":
      return "상관없음";
    default:
      return preset;
  }
}

export {
  generateMarketTradeDateCandidates,
  generateMarketTradeTimeSlotsForDate,
  formatMarketTradeDateLabelKo,
} from "@/lib/globe/market/market-trade-schedule";
