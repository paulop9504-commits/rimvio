import type { LoopType } from "@/lib/loop-wiring/loop-contract";
import type {
  EventHorizonInsight,
  EventHorizonKind,
  GlobalBrainSnapshot,
  UserStatusRecord,
} from "@/lib/global-brain/types";

export type GuardianTone = "jarvis" | "partner";

const LOOP_CONTEXT: Record<GuardianTone, Record<LoopType, string>> = {
  jarvis: {
    MORNING_LOOP: "아침 운영 — 오늘 일정을 먼저 정렬합니다",
    TRANSIT_LOOP: "이동 구간 — 길찾기·출발 준비를 우선합니다",
    INTERRUPTION_LOOP: "개입 감지 — 알림·연락을 우선 처리합니다",
    EVENING_LOOP: "저녁 구간 — 약속·휴식 리소스를 먼저 봅니다",
  },
  partner: {
    MORNING_LOOP: "아침 흐름 — 오늘 일정을 먼저 맞추고 있어요",
    TRANSIT_LOOP: "이동 중 — 길찾기·출근에 맞춰 제안해요",
    INTERRUPTION_LOOP: "방금 끼어든 일 — 알림·연락을 우선해요",
    EVENING_LOOP: "저녁 흐름 — 약속·휴식 쪽을 먼저 볼게요",
  },
};

const EVENT_HORIZON_JARVIS: Record<
  EventHorizonKind,
  { headline: (ctx: EventHorizonCopyContext) => string; suggestion: string }
> = {
  tired_heavy_schedule: {
    headline: () => "일정 밀도가 높습니다. 컨디션 대비 과부하 위험이 있습니다.",
    suggestion: "급하지 않은 Apex 블록부터 내일로 이월하는 것을 권장합니다.",
  },
  tired_early_meeting: {
    headline: (ctx) =>
      ctx.meetingLabel
        ? `${ctx.meetingLabel} — 현재 상태와 충돌 가능성이 있습니다.`
        : "이른 미팅 — 현재 상태와 충돌 가능성이 있습니다.",
    suggestion: "준비 시간을 줄이거나 시작 시각 조정을 검토하세요.",
  },
  late_work_early_meeting: {
    headline: (ctx) =>
      ctx.meetingLabel
        ? `야간 작업 후 ${ctx.meetingLabel} — 회복 시간이 부족합니다.`
        : "야간 작업 후 이른 일정 — 회복 시간이 부족합니다.",
    suggestion: "오늘은 핵심 항목만 처리하고 나머지는 과감히 미루세요.",
  },
  no_lunch_window: {
    headline: () => "점심 슬롯이 일정에 없습니다.",
    suggestion: "30분 식사 블록을 비워 두는 것을 권장합니다.",
  },
  stressed_dense_day: {
    headline: () => "스트레스 신호와 일정 밀도가 동시에 높습니다.",
    suggestion: "Sentinel 모드로 급한 항목만 남기고 나머지는 일시 중단하세요.",
  },
};

const EVENT_HORIZON_PARTNER: Record<
  EventHorizonKind,
  { headline: (ctx: EventHorizonCopyContext) => string; suggestion: string }
> = {
  tired_heavy_schedule: {
    headline: () => "오늘 일정이 꽤 빡빡해요.",
    suggestion: "피곤하신 상태라면 덜 급한 Apex 블록부터 내일로 미루는 게 좋겠어요.",
  },
  tired_early_meeting: {
    headline: (ctx) =>
      ctx.meetingLabel ?? "이른 미팅 — 몸 상태와 맞지 않을 수 있어요.",
    suggestion: "미리 준비 시간을 줄이거나, 가능하면 시작 시간을 조정해 볼까요?",
  },
  late_work_early_meeting: {
    headline: (ctx) =>
      ctx.meetingLabel
        ? `어젯밤 늦게까지 하셨는데, ${ctx.meetingLabel}이 있어요.`
        : "어젯밤 늦게까지 하셨는데, 이른 일정이 있어요.",
    suggestion: "오늘은 핵심만 하고, 나머지는 과감히 미루는 게 낫겠어요.",
  },
  no_lunch_window: {
    headline: () => "점심 시간인데 오늘 일정에 식사 블록이 없어요.",
    suggestion: "30분 점심 슬롯을 비워 둘까요?",
  },
  stressed_dense_day: {
    headline: () => "스트레스 받는 날인데 일정이 많아요.",
    suggestion: "Sentinel 모드로 급한 것만 남기고 나머지는 잠시 멈출까요?",
  },
};

export type EventHorizonCopyContext = {
  meetingLabel?: string | null;
  statusLabel?: string | null;
};

export type GuardianNudgeCopy = {
  tone: GuardianTone;
  headline: string;
  suggestion: string;
  summary: string;
  statusPrefix: string | null;
  primaryActionLabel: string;
  secondaryActionLabel: string;
};

export function deriveLoopContextKo(
  loopType: LoopType | null | undefined,
  tone: GuardianTone = "jarvis",
): string | null {
  if (!loopType) {
    return null;
  }
  return LOOP_CONTEXT[tone][loopType] ?? null;
}

function statusPrefix(
  userStatus: UserStatusRecord | null,
  tone: GuardianTone,
): string | null {
  if (!userStatus?.label) {
    return null;
  }
  return tone === "jarvis"
    ? `${userStatus.label} 상태 감지. `
    : `${userStatus.label} 상태를 기억하고 있어요. `;
}

export function formatEventHorizonNudgeCopy(input: {
  insight: EventHorizonInsight;
  snapshot: GlobalBrainSnapshot;
  tone?: GuardianTone;
  meetingLabel?: string | null;
}): GuardianNudgeCopy {
  const tone = input.tone ?? "jarvis";
  const table = tone === "jarvis" ? EVENT_HORIZON_JARVIS : EVENT_HORIZON_PARTNER;
  const template = table[input.insight.kind];
  const ctx: EventHorizonCopyContext = {
    meetingLabel: input.meetingLabel ?? null,
    statusLabel: input.snapshot.userStatus?.label ?? null,
  };

  const headline = template.headline(ctx);
  const suggestion = template.suggestion;
  const prefix = statusPrefix(input.snapshot.userStatus, tone);

  return {
    tone,
    headline,
    suggestion,
    summary: `${prefix ?? ""}${headline} ${suggestion}`.trim(),
    statusPrefix: prefix,
    primaryActionLabel: tone === "jarvis" ? "일정 재배치" : "일정 조정하기",
    secondaryActionLabel: tone === "jarvis" ? "핵심만 유지" : "급한 것만",
  };
}

export function guardianPushBadge(tone: GuardianTone): string {
  return tone === "jarvis" ? "Guardian" : "맥락 알림";
}
