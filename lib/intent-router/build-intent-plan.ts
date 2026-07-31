/**
 * Intent Plan — Cursor-style plan between Intent Router and Workspace.
 * Draft only: no Reality Commit, no auto booking.
 */

import type { IntentDomain, IntentRoute } from "@/lib/intent-router/types";

export type IntentPlanGoal = {
  readonly id: string;
  readonly labelKo: string;
};

export type IntentPlanEntity = {
  readonly id: string;
  readonly kind: "flight" | "lodging" | "itinerary" | "eatery" | "poi" | "other";
  readonly labelKo: string;
  readonly emoji: string;
};

export type IntentPlan = {
  readonly planId: string;
  readonly status: "draft";
  readonly domain: IntentDomain;
  readonly mode: IntentRoute["mode"];
  /** 0..1 deterministic score — not LLM. */
  readonly confidenceScore: number;
  readonly titleKo: string;
  readonly destinationKo: string | null;
  readonly stayLabelKo: string | null;
  readonly goals: readonly IntentPlanGoal[];
  readonly expectedEntities: readonly IntentPlanEntity[];
  readonly previewLinesKo: readonly string[];
};

function scoreFromRoute(route: IntentRoute): number {
  let s = 0.55;
  if (route.destinationKo) s += 0.12;
  if (route.stayLabelKo) s += 0.12;
  if (route.confidence === "hard") s += 0.18;
  else if (route.confidence === "draft") s += 0.12;
  else s += 0.04;
  if (route.domain === "travel" && route.mode === "create") s += 0.05;
  return Math.min(0.97, Math.round(s * 100) / 100);
}

function travelGoals(stay: string | null): IntentPlanGoal[] {
  return [
    { id: "flight", labelKo: "항공·이동 찾기" },
    { id: "lodging", labelKo: "숙소 추천" },
    {
      id: "route",
      labelKo: stay ? `${stay} 동선 최적화` : "동선 최적화",
    },
    { id: "food", labelKo: "맛집·현지 경험" },
  ];
}

function travelEntities(): IntentPlanEntity[] {
  return [
    { id: "flight", kind: "flight", labelKo: "항공", emoji: "✈" },
    { id: "lodging", kind: "lodging", labelKo: "숙소", emoji: "🏨" },
    { id: "itinerary", kind: "itinerary", labelKo: "일정", emoji: "🎢" },
    { id: "eatery", kind: "eatery", labelKo: "맛집", emoji: "🍣" },
  ];
}

/**
 * Build Intent Plan from route — Planner Agent (deterministic MVP).
 */
export function buildIntentPlan(input: {
  readonly route: IntentRoute;
  readonly utterance?: string | null;
}): IntentPlan {
  const route = input.route;
  const dest = route.destinationKo?.trim() || null;
  const stay = route.stayLabelKo?.trim() || null;
  const titleKo =
    dest && stay
      ? `${dest} ${stay}`
      : dest
        ? `${dest} 여행`
        : "여행 Context";

  const goals =
    route.domain === "travel"
      ? travelGoals(stay)
      : [{ id: "open", labelKo: "Context 준비" }];

  const expectedEntities =
    route.domain === "travel"
      ? travelEntities()
      : [
          {
            id: "entity",
            kind: "other" as const,
            labelKo: "객체",
            emoji: "📍",
          },
        ];

  const previewLinesKo = [
    dest ? `목적지 · ${dest}` : "목적지 · 미정",
    stay ? `기간 · ${stay}` : "기간 · 미정",
    `예상 Entity · ${expectedEntities.length}개`,
  ];

  return {
    planId: `intent-plan:${Date.now().toString(36)}`,
    status: "draft",
    domain: route.domain,
    mode: route.mode,
    confidenceScore: scoreFromRoute(route),
    titleKo,
    destinationKo: dest,
    stayLabelKo: stay,
    goals,
    expectedEntities,
    previewLinesKo,
  };
}

/** Assistant body for Draft preview (Workspace not open yet). */
export function formatIntentPlanDraftReply(plan: IntentPlan): string {
  const entityLine = plan.expectedEntities
    .map((e) => `${e.emoji} ${e.labelKo}`)
    .join(" · ");
  const goalLines = plan.goals
    .slice(0, 4)
    .map((g) => `· ${g.labelKo}`)
    .join("\n");
  return [
    `${plan.titleKo} Context를 준비했습니다.`,
    "",
    ...plan.previewLinesKo,
    entityLine ? `구성 ${entityLine}` : null,
    "",
    "작업 계획",
    goalLines,
    "",
    "이 기준으로 시작할까요?",
  ]
    .filter((line) => line != null)
    .join("\n");
}
