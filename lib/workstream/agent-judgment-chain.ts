/**
 * Agent Judgment Chain — Cursor-style small judges (ADR-044 / ADR-045).
 * Complexity → Scope → Risk → Confidence → Reality Cost → Strategy.
 */

import type { IntentGoalState } from "@/lib/workstream/compile-intent-to-goal-state";

export type TaskComplexityBand = "easy" | "medium" | "hard";

export type TaskScopeDomain =
  | "ui"
  | "search"
  | "lodging"
  | "schedule"
  | "transit"
  | "eatery"
  | "booking"
  | "preference"
  | "verification"
  | "commit"
  | "flight"
  | "context_graph"
  | "weather"
  | "observation";

/**
 * Strategy = workflow depth inside one Agent Runtime — not parallel agents.
 */
export type AgentStrategyId =
  | "quick"
  | "lookup"
  | "planning"
  | "simulation"
  | "execution"
  | "recovery"
  | "observation"
  /** @deprecated Prefer planning — kept for brief multi-step label */
  | "multi";

export type UserApprovalNeed =
  | "none"
  | "soft_chip"
  | "field_commit"
  | "final_commit_only";

export type TaskComplexityAnalysis = {
  readonly band: TaskComplexityBand;
  /** 0–10 */
  readonly score: number;
  readonly reasonKo: string;
};

export type TaskScopeAnalysis = {
  readonly domains: readonly TaskScopeDomain[];
  readonly reasonKo: string;
};

export type ConfidenceAnalysis = {
  /** 0–1 */
  readonly score01: number;
  /** 0–100 */
  readonly percent: number;
  readonly reasonKo: string;
  /** When true, Strategy forces Lookup / search first. */
  readonly forceLookup: boolean;
};

export type RealityCostEstimate = {
  /** 0–10 wall-clock / step burden */
  readonly timeCost: number;
  /** 0–10 how many Context / Reality surfaces change */
  readonly dataImpact: number;
  /** 0–10 auto-run safety risk */
  readonly failureRisk: number;
  readonly estimatedSteps: number;
  readonly verificationRequired: boolean;
  readonly userApprovalNeed: UserApprovalNeed;
  readonly complexity: TaskComplexityAnalysis;
  readonly scope: TaskScopeAnalysis;
  readonly confidence: ConfidenceAnalysis;
};

export type AgentStrategySelection = {
  readonly strategy: AgentStrategyId;
  readonly labelKo: string;
  /** Skip full Trip Task Graph when true (Quick / Lookup path). */
  readonly skipFullPlanner: boolean;
  /** Run Verification → Repair before Commit. */
  readonly runVerificationLoop: boolean;
  readonly reasonKo: string;
};

export type AgentJudgmentChainResult = {
  readonly utterance: string;
  readonly cost: RealityCostEstimate;
  readonly strategy: AgentStrategySelection;
  readonly briefKo: string;
};

const EVENT = "rimvio:agent-judgment-chain";
const LOW_CONFIDENCE_THRESHOLD = 0.35;

let lastJudgment: AgentJudgmentChainResult | null = null;

function clamp10(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 1000) / 1000));
}

function uniqueDomains(
  domains: readonly TaskScopeDomain[],
): TaskScopeDomain[] {
  return [...new Set(domains)];
}

/** 1 — Task Complexity Analyzer */
export function analyzeTaskComplexity(input: {
  readonly utterance: string;
  readonly intentGoal?: IntentGoalState | null;
}): TaskComplexityAnalysis {
  const text = input.utterance.trim();
  const pending = input.intentGoal?.pendingSlots.length ?? 0;

  if (
    /오늘\s*(비|날씨|미세먼지)|날씨\s*(어때|알려)|비와\??/u.test(text) ||
    /지금\s*(몇\s*시|상태)|진행\s*(어때|상황)/u.test(text)
  ) {
    return {
      band: "easy",
      score: 1.5,
      reasonKo: "사실 조회 · Lookup",
    };
  }

  if (
    /^(숙소|호텔|맛집|카페|식당|교통|비행기|항공)\s*만\b/u.test(text) ||
    /(만\s*찾아|만\s*검색|만\s*보여)/u.test(text) ||
    /^(찾아줘|검색해|보여줘)\s*$/u.test(text)
  ) {
    return {
      band: "easy",
      score: 2.2,
      reasonKo: "단일 도메인 조회 — Quick",
    };
  }

  const tripFrame =
    /여행\s*(준비|만들|짜|계획)|trip\s*plan|전체\s*일정|예약까지|오사카\s*여행|도쿄\s*여행|제주\s*여행|제주도\s*여행/iu.test(
      text,
    ) ||
    (input.intentGoal?.intentFamily === "Create" && pending >= 4);

  if (tripFrame || pending >= 5) {
    return {
      band: "hard",
      score: clamp10(7.5 + Math.min(2, pending * 0.25)),
      reasonKo: "여행·다슬롯 Goal — Planning",
    };
  }

  if (
    /바꿔|수정|추가|옮겨|취소|비교|추천|일정에|호텔\s*잡|시뮬|만약/u.test(
      text,
    ) ||
    pending >= 2
  ) {
    return {
      band: "medium",
      score: clamp10(4.5 + pending * 0.4),
      reasonKo: "부분 변경 — Planning / Simulation",
    };
  }

  if (text.length <= 12 && !/여행|예약|commit|커밋/iu.test(text)) {
    return {
      band: "easy",
      score: 2.8,
      reasonKo: "짧은 단일 요청",
    };
  }

  return {
    band: "medium",
    score: 5.2,
    reasonKo: "기본 Planning",
  };
}

/** 2 — Scope Analyzer */
export function analyzeTaskScope(input: {
  readonly utterance: string;
  readonly intentGoal?: IntentGoalState | null;
  readonly complexity: TaskComplexityAnalysis;
}): TaskScopeAnalysis {
  const text = input.utterance.trim();
  const domains: TaskScopeDomain[] = [];

  if (/날씨|비와|미세먼지|weather/iu.test(text)) domains.push("weather");
  if (/숙소|호텔|hostel|lodging/iu.test(text)) domains.push("lodging");
  if (/맛집|카페|식당|음식|밥|웨이팅/iu.test(text)) domains.push("eatery");
  if (/일정|스케줄|itinerary|관광|코스/iu.test(text)) domains.push("schedule");
  if (/교통|전철|지하철|JR|이동|도보|기차/iu.test(text)) domains.push("transit");
  if (/비행|항공|flight/iu.test(text)) domains.push("flight");
  if (/예약|결제|커밋|commit|booking|예약해/iu.test(text)) {
    domains.push("booking", "commit");
  }
  if (/찾아|검색|search|보여/iu.test(text)) domains.push("search");
  if (/조용|도보|가성비|선호|preference/iu.test(text)) domains.push("preference");
  if (/진행|상태|어디까지|뭐\s*됐어|관찰/iu.test(text)) {
    domains.push("observation");
  }
  if (/비교|시뮬|만약|대안/iu.test(text)) domains.push("schedule");

  if (input.complexity.band === "hard") {
    domains.push(
      "context_graph",
      "lodging",
      "schedule",
      "transit",
      "eatery",
      "verification",
      "commit",
    );
  } else if (input.complexity.band === "medium") {
    domains.push("context_graph", "search");
    if (input.intentGoal && input.intentGoal.pendingSlots.length > 0) {
      for (const slot of input.intentGoal.pendingSlots) {
        if (slot === "lodging") domains.push("lodging");
        if (slot === "food") domains.push("eatery");
        if (slot === "route" || slot === "dates") domains.push("schedule");
        if (slot === "flight") domains.push("flight");
      }
    }
  } else if (domains.length === 0) {
    domains.push("search", "ui");
  }

  const uniq = uniqueDomains(domains);
  return {
    domains: uniq,
    reasonKo: `영향 범위: ${uniq.join(" · ")}`,
  };
}

/**
 * 3 — Confidence Analyzer
 * Low confidence → force Lookup (search first), like Cursor when unsure.
 */
export function analyzeConfidence(input: {
  readonly utterance: string;
  readonly intentGoal?: IntentGoalState | null;
  readonly complexity: TaskComplexityAnalysis;
  readonly scope: TaskScopeAnalysis;
}): ConfidenceAnalysis {
  const text = input.utterance.trim();
  let score = 0.72;

  if (text.length < 4) score -= 0.35;
  else if (text.length < 10) score -= 0.12;

  if (/어쩌면|아마|잘\s*모르|추천해\s*줘|아무거나|알아서|대충/u.test(text)) {
    score -= 0.28;
  }
  if (/\?|뭐가\s*좋|어디에|어느\s*쪽/u.test(text)) score -= 0.12;

  const confirmed = input.intentGoal?.confirmedHints.length ?? 0;
  const pending = input.intentGoal?.pendingSlots.length ?? 0;
  if (confirmed >= 2) score += 0.1;
  if (pending >= 4) score -= 0.15;
  if (input.complexity.band === "hard" && confirmed === 0) score -= 0.18;

  if (
    input.scope.domains.includes("weather") ||
    /오늘\s*(비|날씨)|비와/u.test(text)
  ) {
    score = Math.max(score, 0.85);
  }

  if (
    /예약해|커밋|commit/iu.test(text) &&
    input.scope.domains.includes("booking")
  ) {
    score += 0.08;
  }

  score = clamp01(score);
  const forceLookup = score < LOW_CONFIDENCE_THRESHOLD;
  return {
    score01: score,
    percent: Math.round(score * 100),
    forceLookup,
    reasonKo: forceLookup
      ? `확신 ${Math.round(score * 100)}% — 검색을 먼저 수행`
      : `확신 ${Math.round(score * 100)}%`,
  };
}

/** 4 — Reality Cost Estimator */
export function estimateRealityCost(input: {
  readonly utterance: string;
  readonly intentGoal?: IntentGoalState | null;
}): RealityCostEstimate {
  const complexity = analyzeTaskComplexity(input);
  const scope = analyzeTaskScope({
    utterance: input.utterance,
    intentGoal: input.intentGoal,
    complexity,
  });
  const confidence = analyzeConfidence({
    utterance: input.utterance,
    intentGoal: input.intentGoal,
    complexity,
    scope,
  });

  const domainCount = scope.domains.length;
  const pending = input.intentGoal?.pendingSlots.length ?? 0;

  let timeCost = complexity.score * 0.85;
  let dataImpact = Math.min(10, domainCount * 1.1 + pending * 0.5);
  let failureRisk = complexity.score * 0.55;

  if (scope.domains.includes("booking") || scope.domains.includes("commit")) {
    failureRisk += 2.2;
    dataImpact += 1.5;
  }
  if (scope.domains.includes("verification")) {
    failureRisk += 0.8;
  }
  if (confidence.forceLookup) {
    timeCost += 0.8;
    failureRisk = Math.max(0, failureRisk - 0.5);
  }
  if (complexity.band === "easy") {
    timeCost = Math.min(timeCost, 3);
    dataImpact = Math.min(dataImpact, 3.5);
    failureRisk = Math.min(failureRisk, 2.5);
  }

  timeCost = clamp10(timeCost);
  dataImpact = clamp10(dataImpact);
  failureRisk = clamp10(failureRisk);

  const estimatedSteps =
    complexity.band === "easy"
      ? Math.max(1, Math.min(3, domainCount))
      : complexity.band === "medium"
        ? Math.max(3, Math.min(8, 2 + domainCount + Math.floor(pending / 2)))
        : Math.max(8, Math.min(16, 6 + domainCount + pending));

  const verificationRequired =
    complexity.band === "hard" ||
    scope.domains.includes("booking") ||
    scope.domains.includes("commit") ||
    failureRisk >= 5.5;

  let userApprovalNeed: UserApprovalNeed = "none";
  if (scope.domains.includes("booking") || scope.domains.includes("commit")) {
    userApprovalNeed = "final_commit_only";
  } else if (complexity.band === "hard" || failureRisk >= 6) {
    userApprovalNeed = "field_commit";
  } else if (complexity.band === "medium") {
    userApprovalNeed = "soft_chip";
  }

  return {
    timeCost,
    dataImpact,
    failureRisk,
    estimatedSteps,
    verificationRequired,
    userApprovalNeed,
    complexity,
    scope,
    confidence,
  };
}

/** 5 — Strategy Selector */
export function selectAgentStrategy(
  cost: RealityCostEstimate,
  utterance?: string,
): AgentStrategySelection {
  const text = (utterance ?? "").trim();

  if (cost.confidence.forceLookup) {
    return {
      strategy: "lookup",
      labelKo: "Lookup",
      skipFullPlanner: true,
      runVerificationLoop: false,
      reasonKo: cost.confidence.reasonKo,
    };
  }

  if (
    cost.scope.domains.includes("weather") ||
    /오늘\s*(비|날씨)|비와\??/u.test(text)
  ) {
    return {
      strategy: "lookup",
      labelKo: "Lookup",
      skipFullPlanner: true,
      runVerificationLoop: false,
      reasonKo: "사실 조회",
    };
  }

  if (
    cost.scope.domains.includes("observation") ||
    /진행\s*(어때|상황)|어디까지|뭐\s*됐어/u.test(text)
  ) {
    return {
      strategy: "observation",
      labelKo: "Observation",
      skipFullPlanner: true,
      runVerificationLoop: false,
      reasonKo: "상태 관찰",
    };
  }

  if (
    /고치|복구|repair|다시\s*해|실패/iu.test(text) ||
    cost.failureRisk >= 8
  ) {
    return {
      strategy: "recovery",
      labelKo: "Recovery",
      skipFullPlanner: false,
      runVerificationLoop: true,
      reasonKo: "복구 · Verify → Repair",
    };
  }

  if (
    /예약해|결제|커밋해|commit/iu.test(text) ||
    (cost.scope.domains.includes("booking") &&
      cost.scope.domains.includes("commit") &&
      cost.complexity.band !== "hard")
  ) {
    return {
      strategy: "execution",
      labelKo: "Execution",
      skipFullPlanner: true,
      runVerificationLoop: true,
      reasonKo: "예약/Commit 실행 — Verification 필수",
    };
  }

  if (/비교|시뮬|만약|대안|뭐가\s*낫/u.test(text)) {
    return {
      strategy: "simulation",
      labelKo: "Simulation",
      skipFullPlanner: false,
      runVerificationLoop: cost.verificationRequired,
      reasonKo: "대안 시뮬레이션",
    };
  }

  if (
    cost.complexity.band === "easy" &&
    cost.failureRisk < 4 &&
    !cost.scope.domains.includes("commit")
  ) {
    return {
      strategy: "quick",
      labelKo: "Quick",
      skipFullPlanner: true,
      runVerificationLoop: cost.verificationRequired,
      reasonKo: "Easy · 바로 검색/수정",
    };
  }

  if (cost.complexity.band === "hard" || cost.estimatedSteps >= 10) {
    return {
      strategy: "planning",
      labelKo: "Planning",
      skipFullPlanner: false,
      runVerificationLoop: true,
      reasonKo: "Hard · Plan → Execute → Verify → Repair → Commit",
    };
  }

  return {
    strategy: "planning",
    labelKo: "Planning",
    skipFullPlanner: false,
    runVerificationLoop: cost.verificationRequired,
    reasonKo: "Medium · Task Graph 후 실행",
  };
}

export function formatRealityCostBrief(cost: RealityCostEstimate): string {
  const approval =
    cost.userApprovalNeed === "final_commit_only"
      ? "Final Commit Only"
      : cost.userApprovalNeed === "field_commit"
        ? "Field Commit"
        : cost.userApprovalNeed === "soft_chip"
          ? "Soft chip"
          : "None";
  return [
    `Complexity: ${cost.complexity.band} (${cost.complexity.score}/10)`,
    `Impact: ${cost.dataImpact}/10 · Time: ${cost.timeCost}/10 · Risk: ${cost.failureRisk}/10`,
    `Confidence: ${cost.confidence.percent}%`,
    `Estimated Steps: ${cost.estimatedSteps}`,
    `Verification: ${cost.verificationRequired ? "Yes" : "No"}`,
    `User Approval: ${approval}`,
  ].join("\n");
}

/**
 * Full chain: Complexity → Scope → Confidence → Reality Cost → Strategy.
 */
export function runAgentJudgmentChain(input: {
  readonly utterance: string;
  readonly intentGoal?: IntentGoalState | null;
}): AgentJudgmentChainResult {
  const utterance = input.utterance.trim();
  const cost = estimateRealityCost({
    utterance,
    intentGoal: input.intentGoal,
  });
  const strategy = selectAgentStrategy(cost, utterance);
  const briefKo = [
    formatRealityCostBrief(cost),
    `Strategy: ${strategy.labelKo}`,
    strategy.reasonKo,
  ].join("\n");

  const result: AgentJudgmentChainResult = {
    utterance,
    cost,
    strategy,
    briefKo,
  };
  lastJudgment = result;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: result }));
  }
  return result;
}

export function readLastAgentJudgment(): AgentJudgmentChainResult | null {
  return lastJudgment;
}

export function clearLastAgentJudgmentForTests(): void {
  lastJudgment = null;
}
