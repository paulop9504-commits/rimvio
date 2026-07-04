import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ContextLodgingInventoryRow,
  LodgingStayWindow,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { formatPlanWindowLabel } from "@/lib/plan-context/format-plan-window-label";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECKOUT_BUFFER_MS = 8 * 60 * 60 * 1000;

export type LodgingStayPhase =
  | "pre_checkin"
  | "check_in_day"
  | "mid_stay"
  | "last_night"
  | "checkout_day"
  | "unknown";

function normalizeIso(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function deriveNights(
  startIso: string | null,
  endIso: string | null,
): number | null {
  const startMs = startIso ? parseIsoMs(startIso) : null;
  const endMs = endIso ? parseIsoMs(endIso) : null;
  if (startMs == null || endMs == null || endMs <= startMs) {
    return null;
  }
  return Math.max(1, Math.round((endMs - startMs) / DAY_MS));
}

export function buildLodgingStayWindow(input: {
  event?: EventCandidate | null;
  row?: Pick<
    ContextLodgingInventoryRow,
    "checkInIso" | "checkOutIso" | "stayWindow"
  > | null;
}): LodgingStayWindow | null {
  const plan = input.event ? readPlanContextFromEvent(input.event) : null;
  const rowWindow = input.row?.stayWindow ?? null;
  const checkInIso = normalizeIso(
    rowWindow?.checkInIso ??
      input.row?.checkInIso ??
      plan?.windowStartIso ??
      input.event?.datetime ??
      null,
  );
  const checkOutIso = normalizeIso(
    rowWindow?.checkOutIso ?? input.row?.checkOutIso ?? plan?.windowEndIso ?? null,
  );
  const confidence =
    rowWindow?.confidence ?? plan?.windowConfidence ?? (checkOutIso ? "confirmed" : "open");
  const nights =
    rowWindow?.nights ??
    plan?.nights ??
    deriveNights(checkInIso, checkOutIso);

  if (!checkInIso && !checkOutIso) {
    return null;
  }

  return {
    checkInIso,
    checkOutIso,
    nights,
    confidence,
  };
}

export function formatLodgingStayWindowLabel(
  stayWindow: LodgingStayWindow | null | undefined,
): string | null {
  if (!stayWindow?.checkInIso) {
    return null;
  }
  return formatPlanWindowLabel({
    windowStartIso: stayWindow.checkInIso,
    windowEndIso: stayWindow.checkOutIso ?? null,
    nights: stayWindow.nights ?? undefined,
    windowConfidence: stayWindow.confidence,
  });
}

function readDateParts(
  iso: string | null | undefined,
): { year: number; month: number; day: number } | null {
  const trimmed = normalizeIso(iso);
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function formatMonthDay(parts: { month: number; day: number }): string {
  return `${parts.month}월 ${parts.day}일`;
}

export function formatLodgingStayBadgeLabel(
  stayWindow: LodgingStayWindow | null | undefined,
): string | null {
  const start = readDateParts(stayWindow?.checkInIso ?? null);
  if (!start) {
    return null;
  }
  const end = readDateParts(stayWindow?.checkOutIso ?? null);
  const nights =
    typeof stayWindow?.nights === "number" && stayWindow.nights > 0
      ? stayWindow.nights
      : null;
  const estimatedSuffix = stayWindow?.confidence === "estimated" ? " (추정)" : "";

  if (!end) {
    return nights
      ? `${formatMonthDay(start)} 체크인 · ${nights}박${estimatedSuffix}`
      : `${formatMonthDay(start)} 체크인${estimatedSuffix}`;
  }

  const rangeLabel =
    start.year === end.year && start.month === end.month
      ? `${start.month}월 ${start.day}일-${end.day}일`
      : `${formatMonthDay(start)}-${formatMonthDay(end)}`;

  return nights
    ? `${rangeLabel} · ${nights}박${estimatedSuffix}`
    : `${rangeLabel}${estimatedSuffix}`;
}

export function resolveLodgingStayPhase(
  stayWindow: LodgingStayWindow | null | undefined,
  now: Date = new Date(),
): LodgingStayPhase {
  const checkInMs = stayWindow?.checkInIso ? parseIsoMs(stayWindow.checkInIso) : null;
  const checkOutMs = stayWindow?.checkOutIso ? parseIsoMs(stayWindow.checkOutIso) : null;
  if (checkInMs == null && checkOutMs == null) {
    return "unknown";
  }

  const nowMs = now.getTime();

  if (checkInMs != null && nowMs < checkInMs) {
    return "pre_checkin";
  }

  if (checkInMs != null && nowMs < checkInMs + DAY_MS) {
    return "check_in_day";
  }

  if (checkOutMs != null && nowMs >= checkOutMs - CHECKOUT_BUFFER_MS) {
    return "checkout_day";
  }

  if (checkOutMs != null && nowMs >= checkOutMs - DAY_MS) {
    return "last_night";
  }

  return "mid_stay";
}
