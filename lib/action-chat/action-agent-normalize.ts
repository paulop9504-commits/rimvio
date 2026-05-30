import { cleanAddressForNav } from "@/lib/action-chat/normalize-address";
import { extractTelDigits } from "@/lib/enrichers/extract-phone";

export function normalizeActionAgentPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }

  const digits = extractTelDigits(raw).replace(/\D/g, "");
  return digits.length >= 9 ? digits : null;
}

export function normalizeActionAgentAddress(raw: string | null | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }

  const nav = cleanAddressForNav(raw.replace(/\s+/g, " ").trim());
  return nav || null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatIsoLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function referenceNoon(referenceDate: string) {
  return new Date(`${referenceDate}T12:00:00+09:00`);
}

function nextWeekendDate(referenceDate: string) {
  const ref = referenceNoon(referenceDate);
  const day = ref.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const target = new Date(ref);
  target.setDate(ref.getDate() + daysUntilSunday);
  target.setHours(10, 0, 0, 0);
  return target;
}

export function parseRelativeDateTimeFromText(
  text: string,
  referenceDate: string
): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(
    /(\d{4}-\d{2}-\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (isoMatch) {
    const [, date, hour = "09", minute = "00", second = "00"] = isoMatch;
    return `${date}T${pad(Number.parseInt(hour, 10))}:${minute}:${second ?? "00"}`;
  }

  const ref = referenceNoon(referenceDate);

  if (/내일/.test(trimmed)) {
    const target = new Date(ref);
    target.setDate(ref.getDate() + 1);
    const timeMatch = trimmed.match(/(?:오전|오후)?\s*(\d{1,2})(?:시|:)?(\d{2})?/);
    if (timeMatch) {
      let hour = Number.parseInt(timeMatch[1]!, 10);
      const minute = Number.parseInt(timeMatch[2] ?? "0", 10);
      if (/오후/.test(trimmed) && hour < 12) {
        hour += 12;
      }
      target.setHours(hour, minute, 0, 0);
    } else {
      target.setHours(9, 0, 0, 0);
    }
    return formatIsoLocal(target);
  }

  if (/오늘/.test(trimmed)) {
    const target = new Date(ref);
    const timeMatch = trimmed.match(
      /(?:오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/
    );
    if (timeMatch) {
      let hour = Number.parseInt(timeMatch[1]!, 10);
      const minute = Number.parseInt(timeMatch[2] ?? "0", 10);
      if (/오후/.test(trimmed) && hour < 12) {
        hour += 12;
      }
      target.setHours(hour, minute, 0, 0);
      return formatIsoLocal(target);
    }
    target.setHours(ref.getHours(), ref.getMinutes(), 0, 0);
    return formatIsoLocal(target);
  }

  if (/모레/.test(trimmed)) {
    const target = new Date(ref);
    target.setDate(ref.getDate() + 2);
    target.setHours(9, 0, 0, 0);
    return formatIsoLocal(target);
  }

  if (/이번\s*주말/.test(trimmed)) {
    return formatIsoLocal(nextWeekendDate(referenceDate));
  }

  const nextMonthMatch = trimmed.match(/다음\s*달\s*(\d{1,2})일/);
  if (nextMonthMatch) {
    const target = new Date(ref);
    target.setMonth(ref.getMonth() + 1, Number.parseInt(nextMonthMatch[1]!, 10));
    target.setHours(9, 0, 0, 0);
    return formatIsoLocal(target);
  }

  const mdMatch = trimmed.match(/(\d{1,2})월\s*(\d{1,2})일(?:\s*(오전|오후)?\s*(\d{1,2})(?:시|:)?(\d{2})?)?/);
  if (mdMatch) {
    const target = new Date(ref);
    target.setMonth(Number.parseInt(mdMatch[1]!, 10) - 1, Number.parseInt(mdMatch[2]!, 10));
    if (mdMatch[4]) {
      let hour = Number.parseInt(mdMatch[4], 10);
      const minute = Number.parseInt(mdMatch[5] ?? "0", 10);
      if (mdMatch[3] === "오후" && hour < 12) {
        hour += 12;
      }
      target.setHours(hour, minute, 0, 0);
    } else {
      target.setHours(9, 0, 0, 0);
    }
    return formatIsoLocal(target);
  }

  const minutesLaterMatch = trimmed.match(/(\d{1,3})\s*분\s*(?:뒤|후|뒤에|후에)/);
  if (minutesLaterMatch) {
    const minutes = Number.parseInt(minutesLaterMatch[1]!, 10);
    const target = new Date();
    target.setSeconds(0, 0);
    target.setMinutes(target.getMinutes() + minutes);
    return formatIsoLocal(target);
  }

  const hoursLaterMatch = trimmed.match(/(\d{1,2})\s*시간\s*(?:뒤|후|뒤에|후에)/);
  if (hoursLaterMatch) {
    const hours = Number.parseInt(hoursLaterMatch[1]!, 10);
    const target = new Date();
    target.setSeconds(0, 0);
    target.setHours(target.getHours() + hours);
    return formatIsoLocal(target);
  }

  const timeOnly = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (timeOnly && /일정|약속|미팅|회의|예약/.test(trimmed)) {
    const target = new Date(ref);
    target.setHours(Number.parseInt(timeOnly[1]!, 10), Number.parseInt(timeOnly[2]!, 10), 0, 0);
    return formatIsoLocal(target);
  }

  return null;
}
