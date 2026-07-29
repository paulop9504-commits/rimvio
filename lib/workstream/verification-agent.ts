/**
 * Verification Agent — feasibility before Commit (ADR-042).
 * Generate → Verify → Repair → Commit. Extend leave-time / distance tools; don't fork solvers.
 */

import { haversineKm } from "@/lib/feed/spacetime-fit";

export type VerificationFindingSeverity = "ok" | "warn" | "block";

export type VerificationFinding = {
  readonly id: string;
  readonly severity: VerificationFindingSeverity;
  readonly titleKo: string;
  readonly detailKo: string;
  /** Suggested repair label for Self Repair Loop. */
  readonly repairHintKo: string | null;
};

export type VerificationReport = {
  readonly ok: boolean;
  readonly findings: readonly VerificationFinding[];
  readonly blocked: boolean;
};

export type ScheduleFeasibilityInput = {
  /** Activity / POI label (e.g. USJ). */
  readonly activityLabelKo: string;
  readonly activityLat: number;
  readonly activityLng: number;
  /** Anchor — usually hotel / stay. */
  readonly anchorLabelKo: string;
  readonly anchorLat: number;
  readonly anchorLng: number;
  /**
   * Earliest user can leave for the activity (local minutes from midnight),
   * or null if unknown.
   */
  readonly leaveReadyMinutes?: number | null;
  /** Activity last entry / close as minutes from midnight (e.g. 17:00 → 1020). */
  readonly activityCloseMinutes?: number | null;
  /** Assumed ground speed km/h for transit estimate. */
  readonly transitKmh?: number;
  /** Max acceptable one-way travel minutes before warn. */
  readonly maxTravelMinutes?: number;
};

function minutesLabel(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Pure feasibility: distance + optional arrival-before-close.
 * Example: arrive 18:00, USJ 16km → often block / repair to nearby day plan.
 */
export function verifyScheduleFeasibility(
  input: ScheduleFeasibilityInput,
): VerificationReport {
  const findings: VerificationFinding[] = [];
  const km = haversineKm(
    input.anchorLat,
    input.anchorLng,
    input.activityLat,
    input.activityLng,
  );
  const transitKmh = input.transitKmh ?? 25;
  const travelMin = Math.max(1, Math.round((km / transitKmh) * 60));
  const walkMin = Math.max(1, Math.round((km * 1000) / 80));
  const maxTravel = input.maxTravelMinutes ?? 90;
  const kmLabel = km < 10 ? km.toFixed(1) : String(Math.round(km));

  findings.push({
    id: "distance",
    severity: travelMin > maxTravel ? "warn" : "ok",
    titleKo: "이동 거리",
    detailKo: `${input.anchorLabelKo} → ${input.activityLabelKo}: ${kmLabel}km · 이동 약 ${travelMin}분 (도보 ${walkMin}분)`,
    repairHintKo:
      travelMin > maxTravel
        ? `${input.activityLabelKo} 대신 숙소 주변 일정으로 변경`
        : null,
  });

  const leave = input.leaveReadyMinutes;
  const close = input.activityCloseMinutes;
  if (leave != null && close != null && Number.isFinite(leave) && Number.isFinite(close)) {
    const arrive = leave + travelMin;
    if (arrive > close) {
      findings.push({
        id: "arrival_impossible",
        severity: "block",
        titleKo: "도착 시간 충돌",
        detailKo: `출발 가능 ${minutesLabel(leave)} · 이동 ${travelMin}분 → 도착 ${minutesLabel(arrive)} · ${input.activityLabelKo} 마감 ${minutesLabel(close)} — 불가능`,
        repairHintKo: `첫날을 ${input.anchorLabelKo} 주변 일정으로 재배치`,
      });
    } else if (arrive > close - 30) {
      findings.push({
        id: "arrival_tight",
        severity: "warn",
        titleKo: "도착 여유 부족",
        detailKo: `도착 ${minutesLabel(arrive)} · 마감 ${minutesLabel(close)} — 여유 30분 미만`,
        repairHintKo: "일정 앞당기기 또는 근처 장소로 교체",
      });
    } else {
      findings.push({
        id: "arrival_ok",
        severity: "ok",
        titleKo: "도착 가능",
        detailKo: `예상 도착 ${minutesLabel(arrive)} · 마감 ${minutesLabel(close)}`,
        repairHintKo: null,
      });
    }
  }

  const blocked = findings.some((f) => f.severity === "block");
  const hasWarn = findings.some((f) => f.severity === "warn");
  return {
    ok: !blocked && !hasWarn,
    findings,
    blocked,
  };
}

/** USJ-style demo: late leave + far park → block (user story). */
export function verifyUsjLateArrivalDemo(): VerificationReport {
  return verifyScheduleFeasibility({
    activityLabelKo: "USJ",
    // Force ~16km story distance from Namba-ish hotel
    activityLat: 34.6654,
    activityLng: 135.4323,
    anchorLabelKo: "난바 호텔",
    anchorLat: 34.662,
    anchorLng: 135.5013,
    leaveReadyMinutes: 18 * 60,
    activityCloseMinutes: 18 * 60, // arrive after leave+travel → block
    transitKmh: 15,
    maxTravelMinutes: 40,
  });
}

/**
 * Build recovery labels from a verification report for Self Repair.
 */
export function repairPlanFromVerification(
  report: VerificationReport,
): readonly string[] {
  const hints = report.findings
    .map((f) => f.repairHintKo)
    .filter((h): h is string => Boolean(h?.trim()));
  if (hints.length === 0 && report.blocked) {
    return ["일정 재계산", "근처 장소로 교체", "Timeline 업데이트"];
  }
  return [...new Set(hints)].slice(0, 4);
}
