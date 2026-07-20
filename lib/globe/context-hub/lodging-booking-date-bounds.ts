/** Local calendar YMD — avoids UTC off-by-one for KR hotel stay dates. */
export function localYmdToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const slice = ymd.slice(0, 10);
  const dt = new Date(`${slice}T12:00:00`);
  if (!Number.isFinite(dt.getTime())) {
    return slice;
  }
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isYmd(value: string | null | undefined): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)));
}

/** Past check-in cannot be booked — clamp up to today. */
export function clampLodgingCheckInYmd(
  ymd: string | null | undefined,
  today = localYmdToday(),
): string {
  if (!isYmd(ymd)) {
    return "";
  }
  const slice = ymd!.slice(0, 10);
  return slice < today ? today : slice;
}

/** Check-out must be at least the day after an allowed check-in. */
export function lodgingCheckOutMinYmd(
  checkInYmd: string | null | undefined,
  today = localYmdToday(),
): string {
  const ci = clampLodgingCheckInYmd(checkInYmd || today, today) || today;
  return addDaysYmd(ci, 1);
}

export function isLodgingCheckInAllowed(
  ymd: string | null | undefined,
  today = localYmdToday(),
): boolean {
  if (!isYmd(ymd)) {
    return false;
  }
  return ymd!.slice(0, 10) >= today;
}

export function areLodgingStayDatesValid(input: {
  checkInYmd: string | null | undefined;
  checkOutYmd: string | null | undefined;
  today?: string;
}): boolean {
  const today = input.today ?? localYmdToday();
  const ci = input.checkInYmd?.slice(0, 10) ?? "";
  const co = input.checkOutYmd?.slice(0, 10) ?? "";
  if (!isLodgingCheckInAllowed(ci, today)) {
    return false;
  }
  return isYmd(co) && co > ci;
}

/** Normalize stay YMD pair for sheet open / submit (never past check-in). */
export function normalizeLodgingStayYmdPair(input: {
  checkInYmd: string | null | undefined;
  checkOutYmd: string | null | undefined;
  today?: string;
}): { checkInYmd: string; checkOutYmd: string } {
  const today = input.today ?? localYmdToday();
  const checkInYmd =
    clampLodgingCheckInYmd(input.checkInYmd, today) || today;
  const minOut = lodgingCheckOutMinYmd(checkInYmd, today);
  const rawOut = input.checkOutYmd?.slice(0, 10) ?? "";
  const checkOutYmd = isYmd(rawOut) && rawOut >= minOut ? rawOut : minOut;
  return { checkInYmd, checkOutYmd };
}
