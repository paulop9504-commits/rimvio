/**
 * Trip stay segments densified by Reality Commit (ADR-037).
 */

export const TRIP_STAY_SEGMENTS_META_KEY = "tripStaySegmentsV1" as const;

export type TripStaySegmentStatus = "candidate" | "confirmed";

export type TripStaySegment = {
  readonly id: string;
  readonly hotelLabel: string;
  readonly placeId: string | null;
  readonly locationLabel: string | null;
  readonly checkInYmd: string;
  readonly checkOutYmd: string;
  readonly status: TripStaySegmentStatus;
  readonly committedAtIso: string;
};

export type TripStaySegmentsBundleV1 = {
  readonly version: 1;
  readonly segments: readonly TripStaySegment[];
};

export type TripStayTimelineDayKind =
  | "arrive"
  | "stay"
  | "move"
  | "depart";

export type TripStayTimelineDay = {
  readonly ymd: string;
  readonly kind: TripStayTimelineDayKind;
  readonly hotelLabel: string | null;
  readonly fromHotelLabel?: string | null;
  readonly toHotelLabel?: string | null;
};

function addDaysYmd(ymdStr: string, days: number): string {
  const ms = Date.parse(`${ymdStr}T12:00:00.000Z`);
  if (!Number.isFinite(ms)) return ymdStr;
  const next = new Date(ms + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

function daysInclusive(startYmd: string, endYmdInclusive: string): string[] {
  const out: string[] = [];
  let cur = startYmd;
  let guard = 0;
  while (cur <= endYmdInclusive && guard < 60) {
    out.push(cur);
    cur = addDaysYmd(cur, 1);
    guard += 1;
  }
  return out;
}

export function readTripStaySegments(
  metadata: Record<string, unknown> | null | undefined,
): readonly TripStaySegment[] {
  const raw = metadata?.[TRIP_STAY_SEGMENTS_META_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const row = raw as { version?: unknown; segments?: unknown };
  if (row.version !== 1 || !Array.isArray(row.segments)) return [];
  return row.segments.filter(
    (s): s is TripStaySegment =>
      Boolean(s) &&
      typeof s === "object" &&
      typeof (s as TripStaySegment).hotelLabel === "string" &&
      typeof (s as TripStaySegment).checkInYmd === "string" &&
      typeof (s as TripStaySegment).checkOutYmd === "string",
  );
}

export function mergeTripStaySegment(
  prior: readonly TripStaySegment[],
  segment: TripStaySegment,
): readonly TripStaySegment[] {
  const byId = new Map(prior.map((s) => [s.id, s]));
  byId.set(segment.id, segment);
  return [...byId.values()].sort((a, b) =>
    a.checkInYmd.localeCompare(b.checkInYmd),
  );
}

/** Expand trip period from confirmed stay segments. */
export function expandTripPeriodFromSegments(
  segments: readonly TripStaySegment[],
): { checkInYmd: string; checkOutYmd: string; nights: number; days: number } | null {
  const confirmed = segments.filter((s) => s.status === "confirmed");
  if (confirmed.length === 0) return null;
  let checkIn = confirmed[0]!.checkInYmd;
  let checkOut = confirmed[0]!.checkOutYmd;
  for (const s of confirmed) {
    if (s.checkInYmd < checkIn) checkIn = s.checkInYmd;
    if (s.checkOutYmd > checkOut) checkOut = s.checkOutYmd;
  }
  const nightMs =
    Date.parse(`${checkOut}T12:00:00.000Z`) -
    Date.parse(`${checkIn}T12:00:00.000Z`);
  const nights = Math.max(1, Math.round(nightMs / 86_400_000));
  return {
    checkInYmd: checkIn,
    checkOutYmd: checkOut,
    nights,
    days: nights + 1,
  };
}

/**
 * Build day-level stay timeline (Hotel A → Move → Hotel B → Departure).
 */
export function buildTripStayTimeline(
  segments: readonly TripStaySegment[],
): readonly TripStayTimelineDay[] {
  const confirmed = [...segments]
    .filter((s) => s.status === "confirmed")
    .sort((a, b) => a.checkInYmd.localeCompare(b.checkInYmd));
  if (confirmed.length === 0) return [];

  const period = expandTripPeriodFromSegments(confirmed);
  if (!period) return [];

  const days = daysInclusive(period.checkInYmd, period.checkOutYmd);
  const out: TripStayTimelineDay[] = [];

  for (let i = 0; i < days.length; i += 1) {
    const day = days[i]!;
    const isFirst = i === 0;
    const isLast = i === days.length - 1;

    const ending = confirmed.find((s) => s.checkOutYmd === day);
    const starting = confirmed.find((s) => s.checkInYmd === day);
    const active = confirmed.find(
      (s) => s.checkInYmd <= day && day < s.checkOutYmd,
    );

    if (isLast) {
      out.push({
        ymd: day,
        kind: "depart",
        hotelLabel: ending?.hotelLabel ?? active?.hotelLabel ?? null,
      });
      continue;
    }

    if (ending && starting && ending.id !== starting.id) {
      out.push({
        ymd: day,
        kind: "move",
        hotelLabel: starting.hotelLabel,
        fromHotelLabel: ending.hotelLabel,
        toHotelLabel: starting.hotelLabel,
      });
      continue;
    }

    if (isFirst) {
      out.push({
        ymd: day,
        kind: "arrive",
        hotelLabel: starting?.hotelLabel ?? active?.hotelLabel ?? null,
      });
      continue;
    }

    out.push({
      ymd: day,
      kind: "stay",
      hotelLabel: active?.hotelLabel ?? null,
    });
  }

  return out;
}
