/**
 * Project Workspace → ReservationDraft inputs (dates / guests / price).
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import type {
  ReservationDateRange,
  ReservationPrice,
} from "@/lib/callout/prepare/types";
import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";
import type { RimvioObject } from "@/lib/callout/types";

function addDaysYmd(ymd: string, days: number): string {
  const t = Date.parse(`${ymd}T12:00:00.000Z`);
  if (!Number.isFinite(t)) return ymd;
  const next = new Date(t + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

export function buildReservationDateRangeFromWorkspace(
  state: ContextWorkspaceState,
): ReservationDateRange {
  const stayLabelKo = state.realityDraft?.stayLabelKo?.trim() || null;
  let nights: number | null = null;
  if (stayLabelKo) {
    const m = /(\d+)\s*박/u.exec(stayLabelKo);
    if (m?.[1]) nights = Number.parseInt(m[1], 10);
  }
  if (nights != null && Number.isFinite(nights) && nights >= 1) {
    const checkInIso = new Date().toISOString().slice(0, 10);
    const checkOutIso = addDaysYmd(checkInIso, nights);
    return {
      checkInIso,
      checkOutIso,
      labelKo: stayLabelKo ?? `${checkInIso} → ${checkOutIso}`,
    };
  }

  // Soft fallback from draft day count
  const dayCount = state.realityDraft?.days?.length ?? 0;
  if (dayCount >= 1) {
    const checkInIso = new Date().toISOString().slice(0, 10);
    const checkOutIso = addDaysYmd(checkInIso, Math.max(1, dayCount));
    return {
      checkInIso,
      checkOutIso,
      labelKo: stayLabelKo ?? `${dayCount}일 · ${checkInIso}→${checkOutIso}`,
    };
  }

  return {
    checkInIso: null,
    checkOutIso: null,
    labelKo: stayLabelKo,
  };
}

export function buildReservationPriceFromObject(
  object: RimvioObject,
): ReservationPrice {
  const labelKo = object.facts.priceLabelKo;
  return {
    amountWon: parseWonAmount(labelKo),
    labelKo,
  };
}

/** Default guest count — Prefer 2 until user edits (Draft only). */
export function defaultGuestCountFromWorkspace(
  _state: ContextWorkspaceState,
): number {
  return 2;
}
