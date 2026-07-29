/**
 * Decompose a high-level goal into sub-goals and tasks.
 */

import type { PlanDAG, PlanNode } from "@/lib/reality-planner/types";

export type DecomposeInput = {
  readonly contextEventId: string;
  readonly goal: string;
  readonly domain?: string;
};

const TRAVEL_TASKS: readonly Omit<PlanNode, "status" | "retryCount" | "maxRetries">[] = [
  { id: "flight", kind: "task", label: "flight_search", labelKo: "항공권 탐색", agentId: "flight", dependsOn: [] },
  { id: "hotel", kind: "task", label: "hotel_search", labelKo: "숙소 탐색", agentId: "lodging", dependsOn: [] },
  { id: "weather", kind: "task", label: "weather_check", labelKo: "날씨 확인", agentId: "weather", dependsOn: [] },
  { id: "route", kind: "task", label: "route_plan", labelKo: "동선 계획", agentId: "route", dependsOn: ["hotel"] },
  { id: "eatery", kind: "task", label: "eatery_search", labelKo: "맛집 탐색", agentId: "eatery", dependsOn: ["route"] },
  { id: "itinerary", kind: "sub_goal", label: "itinerary_build", labelKo: "일정 생성", dependsOn: ["flight", "hotel", "route", "eatery", "weather"] },
  { id: "reservation", kind: "task", label: "reservation_prep", labelKo: "예약 준비", agentId: "booking", dependsOn: ["itinerary"] },
];

function buildDefaultTasks(goal: string): readonly Omit<PlanNode, "status" | "retryCount" | "maxRetries">[] {
  if (/여행|trip|travel|가고\s*싶/iu.test(goal)) {
    return TRAVEL_TASKS;
  }
  return [
    { id: "research", kind: "task", label: "research", labelKo: "조사", dependsOn: [] },
    { id: "execute", kind: "task", label: "execute", labelKo: "실행", dependsOn: ["research"] },
  ];
}

export function decomposeGoal(input: DecomposeInput): PlanDAG {
  const templates = buildDefaultTasks(input.goal);
  const now = new Date().toISOString();

  const goalNode: PlanNode = {
    id: "root",
    kind: "goal",
    label: "root_goal",
    labelKo: input.goal,
    dependsOn: [],
    status: "pending",
    retryCount: 0,
    maxRetries: 0,
  };

  const taskNodes: PlanNode[] = templates.map((t) => ({
    ...t,
    status: "pending" as const,
    retryCount: 0,
    maxRetries: 2,
  }));

  return {
    planId: `plan-${Date.now()}`,
    contextEventId: input.contextEventId,
    rootGoalId: "root",
    nodes: [goalNode, ...taskNodes],
    status: "planning",
    createdAt: now,
    updatedAt: now,
  };
}
