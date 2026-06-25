export type MarketAvailabilityPreset = "weeknight" | "weekend_day" | "flex";

export const DEFAULT_MARKET_AVAILABILITY_PRESET: MarketAvailabilityPreset = "weeknight";

export const MARKET_SCHEDULING_SLA_HOURS = 24;

export function readMarketAvailabilityPreset(raw: unknown): MarketAvailabilityPreset {
  if (raw === "weekend_day" || raw === "flex") {
    return raw;
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

function nextWeekendDayAt(base: Date, weekendOffset: number, hour: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  while (d.getDay() !== 6 && d.getDay() !== 0) {
    d.setDate(d.getDate() + 1);
  }
  if (weekendOffset > 0) {
    d.setDate(d.getDate() + 7 * weekendOffset);
  }
  if (d.getDay() === 6) {
    return d;
  }
  if (d.getDay() === 0) {
    return d;
  }
  return d;
}

/** Deterministic slots from listing availability preset (Pull scheduling SSOT). */
export function generateMarketTradeScheduleCandidates(
  preset: MarketAvailabilityPreset = DEFAULT_MARKET_AVAILABILITY_PRESET,
  now = new Date(),
): string[] {
  const slots: string[] = [];

  if (preset === "weeknight") {
    let dayOffset = 1;
    for (const hour of [18, 19, 20] as const) {
      let candidate = nextDayAt(now, dayOffset, hour);
      candidate = skipWeekend(candidate);
      if (candidate.getTime() <= now.getTime()) {
        candidate = skipWeekend(nextDayAt(now, dayOffset + 1, hour));
      }
      slots.push(candidate.toISOString());
      dayOffset += 1;
    }
    return slots;
  }

  if (preset === "weekend_day") {
    for (let i = 0; i < 3; i += 1) {
      const hour = (13 + i) as 13 | 14 | 15;
      slots.push(nextWeekendDayAt(now, i > 0 ? 1 : 0, hour).toISOString());
    }
    return slots;
  }

  // flex — weekday afternoons (legacy experiment)
  let dayOffset = 1;
  for (const hour of [13, 14, 15] as const) {
    let candidate = nextDayAt(now, dayOffset, hour);
    candidate = skipWeekend(candidate);
    slots.push(candidate.toISOString());
    dayOffset += 1;
  }
  return slots;
}

export function marketAvailabilityPresetLabelKo(preset: MarketAvailabilityPreset): string {
  switch (preset) {
    case "weeknight":
      return "주중 저녁";
    case "weekend_day":
      return "주말 낮";
    case "flex":
      return "평일 오후";
    default:
      return preset;
  }
}
