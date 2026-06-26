import type { MarketAvailabilityPreset } from "@/lib/globe/market/market-availability-preset";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/u;

export function isMarketTradeDateKey(value: string): boolean {
  return DATE_KEY_RE.test(value.trim());
}

export function toMarketTradeDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseMarketTradeDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function dateMatchesMarketAvailabilityPreset(
  dateKey: string,
  preset: MarketAvailabilityPreset,
): boolean {
  if (preset === "anytime") {
    return true;
  }
  const date = parseMarketTradeDateKey(dateKey);
  if (preset === "weekend_day" || preset === "weekend_evening") {
    return isWeekend(date);
  }
  return !isWeekend(date);
}

function hoursForPreset(preset: MarketAvailabilityPreset): readonly number[] {
  switch (preset) {
    case "weekend_evening":
      return [18, 19, 20];
    case "weekend_day":
      return [11, 13, 14, 15];
    case "weekday_afternoon":
      return [13, 14, 15, 17, 18];
    case "weekday_day":
      return [10, 11, 12, 13];
    case "anytime":
      return [11, 14, 18];
    default:
      return [14];
  }
}

export function generateMarketTradeDateCandidates(
  preset: MarketAvailabilityPreset = "anytime",
  now = new Date(),
  maxCount = 5,
): string[] {
  const keys: string[] = [];
  for (let offset = 0; offset < 14 && keys.length < maxCount; offset += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    date.setHours(12, 0, 0, 0);
    const key = toMarketTradeDateKey(date);
    if (!dateMatchesMarketAvailabilityPreset(key, preset)) {
      continue;
    }
    const slots = generateMarketTradeTimeSlotsForDate(preset, key, now);
    if (slots.length === 0) {
      continue;
    }
    keys.push(key);
  }
  return keys;
}

export function generateMarketTradeTimeSlotsForDate(
  preset: MarketAvailabilityPreset,
  dateKey: string,
  now = new Date(),
): string[] {
  if (!isMarketTradeDateKey(dateKey)) {
    return [];
  }
  if (!dateMatchesMarketAvailabilityPreset(dateKey, preset)) {
    return [];
  }
  const base = parseMarketTradeDateKey(dateKey);
  const minLeadMs = 30 * 60 * 1000;
  const slots: string[] = [];
  for (const hour of hoursForPreset(preset)) {
    const slot = new Date(base);
    slot.setHours(hour, 0, 0, 0);
    if (slot.getTime() > now.getTime() + minLeadMs) {
      slots.push(slot.toISOString());
    }
  }
  return slots.slice(0, 6);
}

const PROPOSE_FALLBACK_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

/** Seller propose step — buyer already picked the day; relax preset when strict slots are empty. */
export function generateMarketTradeProposeTimeSlots(
  preset: MarketAvailabilityPreset,
  dateKey: string,
  now = new Date(),
): string[] {
  const strict = generateMarketTradeTimeSlotsForDate(preset, dateKey, now);
  if (strict.length > 0) {
    return strict;
  }
  if (!isMarketTradeDateKey(dateKey)) {
    return [];
  }
  const base = parseMarketTradeDateKey(dateKey);
  const minLeadMs = 30 * 60 * 1000;
  const slots: string[] = [];
  for (const hour of PROPOSE_FALLBACK_HOURS) {
    const slot = new Date(base);
    slot.setHours(hour, 0, 0, 0);
    if (slot.getTime() > now.getTime() + minLeadMs) {
      slots.push(slot.toISOString());
    }
  }
  return slots.slice(0, 6);
}

export function normalizeScheduleCandidateToDateKey(candidate: string): string | null {
  const trimmed = candidate.trim();
  if (isMarketTradeDateKey(trimmed)) {
    return trimmed;
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return toMarketTradeDateKey(new Date(parsed));
}

/** v2 day-pick SSOT — normalize legacy ISO slots, regenerate when empty. */
export function resolveMarketTradeScheduleDateCandidates(
  candidates: readonly string[],
  preset: MarketAvailabilityPreset = "anytime",
  now = new Date(),
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const raw of candidates) {
    const key = normalizeScheduleCandidateToDateKey(raw);
    if (key && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  if (keys.length > 0) {
    return keys.slice(0, 5);
  }
  const generated = generateMarketTradeDateCandidates(preset, now);
  if (generated.length > 0) {
    return generated;
  }
  const anytime = generateMarketTradeDateCandidates("anytime", now);
  if (anytime.length > 0) {
    return anytime;
  }
  return [];
}

export function marketTradeScheduleDateCandidatesNeedBackfill(
  candidates: readonly string[],
  preset: MarketAvailabilityPreset = "anytime",
  now = new Date(),
): boolean {
  const resolved = resolveMarketTradeScheduleDateCandidates(candidates, preset, now);
  if (resolved.length === 0) {
    return false;
  }
  const storedKeys = candidates
    .map(normalizeScheduleCandidateToDateKey)
    .filter((key): key is string => key !== null);
  if (storedKeys.length === 0) {
    return true;
  }
  if (candidates.some((candidate) => !isMarketTradeDateKey(candidate.trim()))) {
    return true;
  }
  if (storedKeys.length !== resolved.length) {
    return true;
  }
  return storedKeys.some((key, index) => key !== resolved[index]);
}

export function isScheduleDateCandidateAllowed(
  dateKey: string,
  candidates: readonly string[],
): boolean {
  if (!isMarketTradeDateKey(dateKey)) {
    return false;
  }
  return candidates.some((candidate) => normalizeScheduleCandidateToDateKey(candidate) === dateKey);
}

export function isMeetTimeAllowedForTrade(input: {
  meetAtIso: string;
  dateKey: string;
  preset: MarketAvailabilityPreset;
  now?: Date;
}): boolean {
  const meetAt = new Date(input.meetAtIso);
  if (!Number.isFinite(meetAt.getTime())) {
    return false;
  }
  if (toMarketTradeDateKey(meetAt) !== input.dateKey.trim()) {
    return false;
  }
  const allowed = generateMarketTradeProposeTimeSlots(
    input.preset,
    input.dateKey,
    input.now ?? new Date(),
  );
  const target = meetAt.getTime();
  return allowed.some((slot) => Date.parse(slot) === target);
}

export function formatMarketTradeDateLabelKo(
  dateKey: string,
  now = new Date(),
): string {
  const todayKey = toMarketTradeDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toMarketTradeDateKey(tomorrow);
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterKey = toMarketTradeDateKey(dayAfter);

  if (dateKey === todayKey) {
    return "오늘";
  }
  if (dateKey === tomorrowKey) {
    return "내일";
  }
  if (dateKey === dayAfterKey) {
    return "모레";
  }

  const date = parseMarketTradeDateKey(dateKey);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()] ?? "";
  return `${weekday} ${date.getMonth() + 1}/${date.getDate()}`;
}
