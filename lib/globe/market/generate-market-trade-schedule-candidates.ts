const SLOT_HOURS = [13, 14, 15] as const;

function nextWeekdayAfternoon(base: Date, dayOffset: number, hour: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Deterministic afternoon slots for seller pick (experiment). */
export function generateMarketTradeScheduleCandidates(now = new Date()): string[] {
  const slots: string[] = [];
  let dayOffset = 1;
  for (const hour of SLOT_HOURS) {
    const candidate = nextWeekdayAfternoon(now, dayOffset, hour);
    slots.push(candidate.toISOString());
    dayOffset += 1;
  }
  return slots;
}
