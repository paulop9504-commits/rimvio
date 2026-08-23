import { resolveFactPlace } from "@/lib/fact-query/data/resolve-fact-place";
import type { FactAnswerWire, FactEvidenceItem } from "@/lib/fact-query/types";
import {
  verifyScheduleFeasibility,
  type ScheduleFeasibilityInput,
} from "@/lib/workstream/verification-agent";

const ACTIVITY_CLOSE_DEFAULT_MINUTES: Record<string, number> = {
  usj: 18 * 60,
};

export function looksLikeScheduleFeasibilityAsk(utterance: string): boolean {
  const t = utterance.trim();
  if (!t || looksLikeDistanceOnlyAsk(t)) {
    return false;
  }

  if (
    /(?:일정|스케줄|schedule).*(?:가능|실현|되|맞|검|확)/iu.test(t) ||
    /(?:가능|갈\s*수|도착\s*가능|시간\s*돼|되\s*겠|될\s*까)/iu.test(t)
  ) {
    if (
      /(?:에서|부터|호텔|숙소).+(?:USJ|유니버설|디즈니|오사카성|도톤보리|시부야|아사쿠사)/iu.test(
        t,
      ) ||
      /(?:USJ|유니버설).+(?:가능|갈\s*수|도착|시간|일정)/iu.test(t) ||
      /(?:출발|leave).+(?:가능|되)/iu.test(t)
    ) {
      return true;
    }
  }

  if (
    /(?:에서|부터).+(?:USJ|유니버설).+(?:가능|갈|도착|일정|갈\s*수)/iu.test(t) ||
    /(?:USJ|유니버설).+(?:18|17|16)\s*시/iu.test(t)
  ) {
    return true;
  }

  return false;
}

function looksLikeDistanceOnlyAsk(text: string): boolean {
  return /(?:까지|→)\s*(?:거리|km|킬로|몇\s*km|얼마나\s*멀)/iu.test(text);
}

function parseTimeMinutes(text: string, role: "leave" | "close"): number | null {
  const patterns =
    role === "leave"
      ? [
          /(?:오후|pm)\s*(\d{1,2})\s*시\s*(?:에\s*)?(?:출발|leave)/iu,
          /(\d{1,2})\s*:\s*(\d{2})\s*(?:출발|leave)/iu,
          /(\d{1,2})\s*시\s*(?:에\s*)?(?:출발|leave)/iu,
          /출발\s*(?:가능|시간)?\s*(?:오후|pm)?\s*(\d{1,2})\s*시/iu,
        ]
      : [
          /(?:오후|pm)\s*(\d{1,2})\s*시\s*(?:마감|입장|까지|close)/iu,
          /(\d{1,2})\s*:\s*(\d{2})\s*(?:마감|입장|까지|close)/iu,
          /(\d{1,2})\s*시\s*(?:마감|입장|까지|close)/iu,
          /(?:마감|입장|close)\s*(?:오후|pm)?\s*(\d{1,2})\s*시/iu,
        ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const h = Number.parseInt(m[1], 10);
    const min = m[2] ? Number.parseInt(m[2], 10) : 0;
    if (!Number.isFinite(h) || h < 0 || h > 23) continue;
    const isPm = /(?:오후|pm)/iu.test(m[0]);
    const hour24 = isPm && h <= 12 ? h + 12 : h;
    return hour24 * 60 + (Number.isFinite(min) ? min : 0);
  }

  if (role === "close") {
    const until = text.match(/(\d{1,2})\s*시\s*까지/iu);
    if (until?.[1]) {
      const h = Number.parseInt(until[1], 10);
      if (Number.isFinite(h) && h >= 0 && h <= 23) {
        return h * 60;
      }
    }
  }

  return null;
}

export function parseScheduleFeasibilityQuery(utterance: string): {
  anchorQuery: string;
  activityQuery: string;
  leaveReadyMinutes: number | null;
  activityCloseMinutes: number | null;
} | null {
  const text = utterance.trim();

  const routeMatch = text.match(
    /(.+?)(?:에서|부터)\s+(.+?)(?:\s+(?:18|17|16|\d{1,2})\s*시|\s+(?:가능|갈|도착|일정|갈\s*수)|$)/iu,
  );
  if (routeMatch?.[1] && routeMatch[2]) {
    return {
      anchorQuery: routeMatch[1].trim(),
      activityQuery: routeMatch[2]
        .replace(/(?:가능|갈\s*수|도착|일정).*$/iu, "")
        .trim(),
      leaveReadyMinutes: parseTimeMinutes(text, "leave"),
      activityCloseMinutes: parseTimeMinutes(text, "close"),
    };
  }

  const activityOnly = text.match(/(USJ|유니버설|오사카성|도톤보리|시부야)/iu);
  if (activityOnly?.[1]) {
    const anchorDefault = /(?:난바|namba|오사카)/iu.test(text)
      ? "난바"
      : /(?:신주쿠|shinjuku|도쿄)/iu.test(text)
        ? "신주쿠"
        : "난바";
    return {
      anchorQuery: anchorDefault,
      activityQuery: activityOnly[1],
      leaveReadyMinutes: parseTimeMinutes(text, "leave"),
      activityCloseMinutes: parseTimeMinutes(text, "close"),
    };
  }

  return null;
}

function severityHeadline(
  blocked: boolean,
  ok: boolean,
  anchorLabel: string,
  activityLabel: string,
): string {
  if (blocked) {
    return `일정 불가 — ${anchorLabel} → ${activityLabel}`;
  }
  if (!ok) {
    return `일정 주의 — ${anchorLabel} → ${activityLabel}`;
  }
  return `일정 가능 — ${anchorLabel} → ${activityLabel}`;
}

export function runScheduleFeasibilityTool(utterance: string): FactAnswerWire | null {
  const parsed = parseScheduleFeasibilityQuery(utterance);
  if (!parsed) {
    return null;
  }

  const anchor = resolveFactPlace(parsed.anchorQuery);
  const activity = resolveFactPlace(parsed.activityQuery);
  if (!anchor || !activity) {
    return null;
  }

  let leaveReadyMinutes = parsed.leaveReadyMinutes;
  let activityCloseMinutes = parsed.activityCloseMinutes;

  if (leaveReadyMinutes != null && activityCloseMinutes == null) {
    activityCloseMinutes =
      ACTIVITY_CLOSE_DEFAULT_MINUTES[activity.id] ?? null;
  }

  const feasibilityInput: ScheduleFeasibilityInput = {
    anchorLabelKo: anchor.labelKo,
    anchorLat: anchor.lat,
    anchorLng: anchor.lng,
    activityLabelKo: activity.labelKo,
    activityLat: activity.lat,
    activityLng: activity.lng,
    leaveReadyMinutes,
    activityCloseMinutes,
    transitKmh: activity.id === "usj" ? 15 : 25,
    maxTravelMinutes: activity.id === "usj" ? 40 : 90,
  };

  const report = verifyScheduleFeasibility(feasibilityInput);

  const evidence: FactEvidenceItem[] = [
    {
      id: `anchor:${anchor.id}`,
      labelKo: anchor.labelKo,
      detailKo: "숙소·출발 기준",
      lat: anchor.lat,
      lng: anchor.lng,
      kind: "poi",
      score: null,
      source: anchor.source,
    },
    {
      id: `activity:${activity.id}`,
      labelKo: activity.labelKo,
      detailKo: report.findings.map((f) => f.detailKo).join(" · "),
      lat: activity.lat,
      lng: activity.lng,
      kind: "highlight",
      score: null,
      source: activity.source,
    },
  ];

  const summaryLines = report.findings.map(
    (f) => `${f.titleKo}: ${f.detailKo}`,
  );
  const repair = report.findings
    .map((f) => f.repairHintKo)
    .filter((h): h is string => Boolean(h?.trim()));
  if (repair.length > 0) {
    summaryLines.push(`제안: ${repair[0]}`);
  }

  const cityLabelKo = /오사카|난바|USJ|도톤보리/u.test(utterance)
    ? "오사카"
    : /도쿄|시부야|신주쿠/u.test(utterance)
      ? "도쿄"
      : null;

  return {
    queryId: `schedule:${anchor.id}:${activity.id}`,
    kind: "schedule_feasibility",
    headlineKo: severityHeadline(
      report.blocked,
      report.ok,
      anchor.labelKo,
      activity.labelKo,
    ),
    summaryKo: summaryLines.join("\n"),
    evidence,
    highlightId: `activity:${activity.id}`,
    cityLabelKo,
    ranTool: true,
    sourceKo: "Rimvio Verification Agent · Haversine",
  };
}
