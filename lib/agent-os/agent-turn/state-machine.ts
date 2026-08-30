/**
 * Agent Turn state machine — valid transitions only.
 */

import {
  AGENT_TURN_STATUSES,
  type AgentTurn,
  type AgentTurnStatus,
  type AgentTurnUnderstand,
} from "@/lib/agent-os/agent-turn/types";

const TRANSITIONS: Readonly<Record<AgentTurnStatus, readonly AgentTurnStatus[]>> = {
  idle: ["understanding"],
  understanding: ["inspecting", "paused", "failed", "reported"],
  inspecting: ["planning", "executing", "verifying", "waiting_approval", "paused", "failed", "reported"],
  planning: ["executing", "waiting_approval", "paused", "failed"],
  executing: ["observing", "waiting_approval", "paused", "failed"],
  observing: ["verifying", "replanning", "executing", "waiting_approval", "failed", "completed"],
  verifying: ["completed", "replanning", "failed", "reported"],
  replanning: ["executing", "planning", "failed"],
  waiting_approval: ["executing", "paused", "failed", "reported"],
  paused: ["planning", "executing", "reported"],
  completed: ["reported"],
  failed: ["replanning", "reported"],
  reported: [],
};

export function canTransition(from: AgentTurnStatus, to: AgentTurnStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transitionAgentTurn(turn: AgentTurn, next: AgentTurnStatus): AgentTurn {
  if (turn.status === next) return turn;
  if (!canTransition(turn.status, next)) {
    if (next === "reported" || next === "failed" || next === "paused") {
      return { ...turn, status: next, updatedAt: new Date().toISOString() };
    }
    return turn;
  }
  return { ...turn, status: next, updatedAt: new Date().toISOString() };
}

export function createAgentTurn(input: {
  readonly request: string;
  readonly sessionId: string;
}): AgentTurn {
  const now = new Date().toISOString();
  return {
    id: `turn-${input.sessionId}-${Date.now()}`,
    sessionId: input.sessionId,
    request: input.request,
    status: "idle",
    intent: null,
    inspection: null,
    planLabels: [],
    steps: [],
    observations: [],
    decisions: [],
    actions: [],
    stepObservations: [],
    verification: null,
    finalResult: null,
    report: null,
    stepCount: 0,
    replanCount: 0,
    retryCount: 0,
    paused: false,
    startedAt: now,
    updatedAt: now,
    compiledGoal: null,
    decisionLevel: null,
    constraints: [],
    discoveredFacts: [],
    engineDecisions: [],
  };
}

export function withIntent(turn: AgentTurn, intent: AgentTurnUnderstand): AgentTurn {
  return { ...turn, intent, updatedAt: new Date().toISOString() };
}

export function isTerminalStatus(status: AgentTurnStatus): boolean {
  return status === "reported" || status === "paused";
}

export function agentTurnStatusLabelKo(status: AgentTurnStatus): string {
  switch (status) {
    case "idle":
      return "대기";
    case "understanding":
      return "요청 파악";
    case "inspecting":
      return "현재 상태 확인";
    case "planning":
      return "계획";
    case "executing":
      return "실행";
    case "observing":
      return "결과 확인";
    case "verifying":
      return "검증";
    case "replanning":
      return "수정 계획";
    case "waiting_approval":
      return "승인 대기";
    case "paused":
      return "일시 중지";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    case "reported":
      return "보고";
    default:
      return status;
  }
}

export { AGENT_TURN_STATUSES };
