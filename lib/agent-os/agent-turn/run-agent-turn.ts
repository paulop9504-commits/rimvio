/**
 * Agent Turn orchestrator — Understand → Inspect → (existing Controller) → Verify → Report.
 * Does not bypass Tool Gateway / Executor / human approval.
 */

import {
  runHubAgentController,
  type HubAgentControllerEvent,
  type HubAgentControllerInput,
  type HubAgentControllerResult,
} from "@/lib/hub/dev/hub-agent-controller";
import { readOperatorMemory, resolveOperatorTurn } from "@/lib/hub/dev/conversation-memory";
import { runAgentController } from "@/lib/agent/agent-controller";
import type { AgentControllerInput, AgentControllerResult } from "@/lib/agent/types";
import type { AgentTurn, AgentTurnActionRecord, AgentTurnEvent, AgentTurnObservation } from "@/lib/agent-os/agent-turn/types";
import { AGENT_TURN_LIMITS, limitReachedMessage } from "@/lib/agent-os/agent-turn/limits";
import {
  createAgentTurn,
  transitionAgentTurn,
  withIntent,
} from "@/lib/agent-os/agent-turn/state-machine";
import { isPauseUtterance, understandRequest } from "@/lib/agent-os/agent-turn/understand";
import { inspectCurrentState } from "@/lib/agent-os/agent-turn/inspect";
import { decideAfterVerification } from "@/lib/agent-os/agent-turn/decide";
import {
  compileExecutableGoal,
  decideWithEngine,
  decisionKindToTurn,
  discoverActionCandidates,
  extractConstraints,
  mutatePlanSteps,
  refreshGoalAgainstState,
  snapshotApplicationState,
} from "@/lib/agent-os/decision-engine";
import {
  browserTestStatusFromActions,
  inspectAfterExecute,
  verifyAgentTurn,
} from "@/lib/agent-os/agent-turn/verify";
import { formatFinalReportKo, generateFinalReport } from "@/lib/agent-os/agent-turn/report";
import { createAgentTurnEvent } from "@/lib/agent-os/agent-turn/events";
import {
  consumeAgentTurnInjections,
  consumeAgentTurnPause,
  detectMidTurnInjection,
  injectAgentTurnRequirement,
  requestAgentTurnPause,
} from "@/lib/agent-os/agent-turn/interrupt";
import { rememberAgentTurn } from "@/lib/agent-os/agent-turn/memory";

export type AgentTurnHubInput = Omit<HubAgentControllerInput, "onEvent"> & {
  readonly onEvent?: HubAgentControllerInput["onEvent"];
};

export type AgentTurnInput = {
  readonly utterance: string;
  readonly sessionId: string;
  readonly hub?: AgentTurnHubInput;
  readonly travel?: AgentControllerInput;
  readonly onTurnEvent?: (event: AgentTurnEvent) => void;
  readonly onHubEvent?: (event: HubAgentControllerEvent) => void;
  readonly limits?: Partial<typeof AGENT_TURN_LIMITS>;
};

export type AgentTurnResult = {
  readonly turn: AgentTurn;
  readonly report: ReturnType<typeof generateFinalReport>;
  readonly reportKo: string;
  readonly hub: HubAgentControllerResult | null;
  readonly travel: AgentControllerResult | null;
};

function emit(
  onTurnEvent: AgentTurnInput["onTurnEvent"],
  event: AgentTurnEvent,
): void {
  onTurnEvent?.(event);
}

function foldHubEvent(turn: AgentTurn, event: HubAgentControllerEvent, sessionId: string): AgentTurn {
  const now = new Date().toISOString();
  if (event.type === "plan") {
    return {
      ...turn,
      planLabels: event.steps.map((s) => s.label),
      steps: event.steps.map((s, i) => ({
        id: `step-${i}`,
        label: s.label,
        status: s.status,
      })),
      updatedAt: now,
    };
  }
  if (event.type === "tool") {
    const record: AgentTurnActionRecord = {
      actionId: `${event.toolId}-${turn.actions.length + 1}`,
      sessionId,
      appId: null,
      actorId: "hub-agent",
      actorRole: "hub",
      intent: turn.intent?.intent ?? null,
      capability: event.toolId.includes(".") ? event.toolId : null,
      tool: event.toolId,
      surface: "hub",
      entityType: null,
      entityId: null,
      input: null,
      output: event.detail ?? null,
      status: event.status === "running" ? "running" : event.status === "failed" ? "failed" : "success",
      verificationStatus: "pending",
      timestamp: now,
    };
    const actions = [...turn.actions.filter((a) => !(a.tool === event.toolId && a.status === "running")), record];
    if (event.status === "running") {
      return { ...turn, actions, stepCount: turn.stepCount + 1, updatedAt: now };
    }
    const observation: AgentTurnObservation = {
      actionId: record.actionId,
      capability: record.capability,
      tool: event.toolId,
      input: null,
      output: event.detail ?? null,
      status: event.status === "failed" ? "failed" : "success",
      affectedEntities: [],
      mutations: [],
      errors: event.status === "failed" && event.detail ? [event.detail] : [],
      timestamp: now,
      summaryKo: event.label,
    };
    return {
      ...turn,
      actions,
      observations: [...turn.observations, observation],
      updatedAt: now,
    };
  }
  if (event.type === "replan") {
    return { ...turn, replanCount: turn.replanCount + 1, updatedAt: now };
  }
  if (event.type === "verify") {
    return {
      ...turn,
      updatedAt: now,
    };
  }
  return { ...turn, updatedAt: now };
}

export async function runAgentTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
  const limits = { ...AGENT_TURN_LIMITS, ...input.limits };
  const sessionId = input.sessionId;
  const memory = readOperatorMemory(sessionId);
  const resolved = resolveOperatorTurn({ utterance: input.utterance.trim(), memory });
  const utterance = resolved.expandedUtterance;

  let turn = createAgentTurn({ request: utterance, sessionId });
  turn = transitionAgentTurn(turn, "understanding");
  emit(input.onTurnEvent, createAgentTurnEvent("AGENT_STARTED", "작업을 시작합니다.", utterance));

  const mid = detectMidTurnInjection(input.utterance);
  if (mid.pause || isPauseUtterance(input.utterance)) {
    requestAgentTurnPause(sessionId);
    turn = transitionAgentTurn({ ...turn, paused: true }, "paused");
    emit(input.onTurnEvent, createAgentTurnEvent("AGENT_PAUSED", "작업을 안전하게 멈췄어요."));
    const report = generateFinalReport({
      turn,
      understand: turn.intent,
      after: turn.inspection,
      verification: null,
      status: "paused",
    });
    turn = { ...transitionAgentTurn(turn, "reported"), report };
    rememberAgentTurn({ platformId: sessionId, understand: turn.intent, turn, report });
    input.onHubEvent?.({ type: "final_report", report });
    return { turn, report, reportKo: formatFinalReportKo(report), hub: null, travel: null };
  }
  if (mid.inject && mid.requirement) {
    injectAgentTurnRequirement(sessionId, mid.requirement);
  }

  const understood = understandRequest({ utterance, memory });
  turn = withIntent(turn, understood);
  emit(
    input.onTurnEvent,
    createAgentTurnEvent("INTENT_DETECTED", "요청을 파악했습니다.", understood.requestedOutcome, {
      intent: understood.intent,
      domain: understood.domain,
    }),
  );

  if (understood.conversational) {
    turn = transitionAgentTurn(turn, "reported");
    const report = generateFinalReport({
      turn,
      understand: understood,
      after: null,
      verification: null,
      status: "partial",
    });
    turn = { ...turn, report };
    input.onHubEvent?.({
      type: "conversational",
      body: "무엇을 하면 될까요? 목표만 말씀해 주시면 이어서 진행할게요.",
    });
    return { turn, report, reportKo: formatFinalReportKo(report), hub: null, travel: null };
  }

  let hub: HubAgentControllerResult | null = null;
  let travel: AgentControllerResult | null = null;

  if (input.hub) {
    turn = transitionAgentTurn(turn, "inspecting");
    emit(input.onTurnEvent, createAgentTurnEvent("INSPECTION_STARTED", "현재 상태를 확인합니다."));
    const before = inspectCurrentState({
      draft: input.hub.draft,
      snapshot: input.hub.snapshot,
      connections: input.hub.connections,
      understand: understood,
    });
    turn = { ...turn, inspection: before };
    emit(input.onTurnEvent, createAgentTurnEvent("STATE_INSPECTION_STARTED", "현재 상태를 확인합니다."));
    const stateSnap = snapshotApplicationState({
      draft: input.hub.draft,
      snapshot: input.hub.snapshot,
      connections: input.hub.connections,
      understand: understood,
      recentActions: turn.actions.map((a) => a.tool),
    });
    let compiledGoal = refreshGoalAgainstState(
      compileExecutableGoal({
        utterance,
        understand: understood,
        state: stateSnap,
        extraConstraints: extractConstraints(utterance),
      }),
      stateSnap,
    );
    const candidates = discoverActionCandidates({
      goal: compiledGoal,
      state: stateSnap,
      intent: understood.intent,
    });
    const engineDecision = decideWithEngine({
      utterance,
      intent: understood.intent,
      domain: understood.domain,
      goal: compiledGoal,
      state: stateSnap,
      candidates,
      surface: stateSnap.surfaces[0] ?? null,
    });
    turn = {
      ...turn,
      compiledGoal,
      decisionLevel: engineDecision.decisionLevel,
      constraints: compiledGoal.constraints,
      engineDecisions: [...(turn.engineDecisions ?? []), engineDecision],
      discoveredFacts: [
        ...(turn.discoveredFacts ?? []),
        `decisionLevel=${engineDecision.decisionLevel}`,
        engineDecision.actionId ? `next=${engineDecision.actionId}` : "no-next",
      ],
    };
    emit(
      input.onTurnEvent,
      createAgentTurnEvent("GOAL_CREATED", compiledGoal.objective, compiledGoal.requirements.join(",")),
    );
    emit(
      input.onTurnEvent,
      createAgentTurnEvent("CAPABILITIES_DISCOVERED", `${candidates.length} candidates`, candidates.map((c) => c.actionId).join(",")),
    );
    emit(
      input.onTurnEvent,
      createAgentTurnEvent("ACTION_SELECTED", engineDecision.reasonKo, engineDecision.decision, {
        decisionLevel: engineDecision.decisionLevel,
        confidence: engineDecision.confidence,
      }),
    );
    emit(
      input.onTurnEvent,
      createAgentTurnEvent("STATE_INSPECTION_COMPLETED", "현재 상태를 읽었습니다.", before.lines.slice(0, 4).join(" · ")),
    );
    emit(
      input.onTurnEvent,
      createAgentTurnEvent("OBSERVATION_CREATED", "현재 상태를 읽었습니다.", before.lines.slice(0, 4).join(" · ")),
    );
    input.onHubEvent?.({ type: "observe", lines: before.lines });

    if (engineDecision.decision === "WAIT_APPROVAL") {
      emit(input.onTurnEvent, createAgentTurnEvent("WAITING_FOR_APPROVAL", engineDecision.reasonKo));
    }

    const injected = consumeAgentTurnInjections(sessionId);
    if (injected.length > 0 && turn.steps.length > 0) {
      turn = {
        ...turn,
        steps: mutatePlanSteps({
          steps: turn.steps,
          requirementLabel: injected.join(" · "),
        }),
      };
    }
    const executeUtterance =
      injected.length > 0 ? `${utterance} ${injected.join(" ")}`.trim() : utterance;

    turn = transitionAgentTurn(turn, "planning");
    turn = transitionAgentTurn(turn, "executing");

    hub = await runHubAgentController({
      ...input.hub,
      utterance: executeUtterance,
      agentTurnAlreadyWrapped: true,
      onEvent: (event) => {
        turn = foldHubEvent(turn, event, sessionId);
        if (event.type === "plan") {
          emit(input.onTurnEvent, createAgentTurnEvent("PLAN_CREATED", "작업을 나눴습니다.", event.goal));
        }
        if (event.type === "tool" && event.status === "running") {
          emit(input.onTurnEvent, createAgentTurnEvent("ACTION_STARTED", event.label, event.toolId));
        }
        if (event.type === "tool" && event.status !== "running") {
          emit(input.onTurnEvent, createAgentTurnEvent("ACTION_COMPLETED", event.label, event.status));
          const lastObs = turn.observations[turn.observations.length - 1];
          if (lastObs) {
            const adaptive = decideWithEngine({
              utterance,
              intent: understood.intent,
              domain: understood.domain,
              goal: compiledGoal,
              state: stateSnap,
              candidates,
              lastObservationFailed: lastObs.status === "failed",
              lastToolId: lastObs.tool,
              replanCount: turn.replanCount,
              retryCount: turn.retryCount,
              maxReplans: limits.maxReplans,
              maxRetries: limits.maxRetriesPerAction,
            });
            turn = {
              ...turn,
              engineDecisions: [...(turn.engineDecisions ?? []), adaptive],
              decisionLevel: adaptive.decisionLevel,
              decisions: [
                ...turn.decisions,
                {
                  kind: decisionKindToTurn(adaptive.decision) as typeof turn.decisions[number]["kind"],
                  reasonKo: adaptive.reasonKo,
                  stepId: lastObs.actionId,
                },
              ],
            };
            if (adaptive.failureType) {
              emit(input.onTurnEvent, createAgentTurnEvent("FAILURE_CLASSIFIED", adaptive.failureType));
            }
            if (adaptive.alternatives.length > 0) {
              emit(
                input.onTurnEvent,
                createAgentTurnEvent("ALTERNATIVES_GENERATED", adaptive.alternatives.map((a) => a.labelKo).join(" · ")),
              );
            }
            if (adaptive.decision === "REPLAN") {
              emit(input.onTurnEvent, createAgentTurnEvent("REPLAN_STARTED", adaptive.reasonKo));
            }
          }
        }
        if (event.type === "replan") {
          emit(input.onTurnEvent, createAgentTurnEvent("REPLAN_STARTED", event.reason));
        }
        if (event.type === "ask_user") {
          turn = transitionAgentTurn(turn, "waiting_approval");
          emit(input.onTurnEvent, createAgentTurnEvent("WAITING_FOR_APPROVAL", event.message));
        }
        if (event.type === "phase" && event.phase === "verify") {
          emit(input.onTurnEvent, createAgentTurnEvent("VERIFICATION_STARTED", "결과를 확인합니다."));
        }
        if (consumeAgentTurnPause(sessionId)) {
          turn = { ...turn, paused: true };
        }
        input.onHubEvent?.(event);
        input.hub?.onEvent?.(event);
      },
    });

    if (turn.stepCount >= limits.maxSteps || turn.replanCount > limits.maxReplans) {
      const report = generateFinalReport({
        turn,
        understand: understood,
        after: turn.inspection,
        verification: turn.verification,
        status: "failed",
      });
      const limited = {
        ...report,
        headlineKo: limitReachedMessage({ replanCount: turn.replanCount, maxReplans: limits.maxReplans }),
        status: "failed" as const,
      };
      turn = { ...transitionAgentTurn(turn, "reported"), report: limited };
      rememberAgentTurn({ platformId: sessionId, understand: understood, turn, report: limited });
      input.onHubEvent?.({ type: "final_report", report: limited });
      return { turn, report: limited, reportKo: formatFinalReportKo(limited), hub, travel: null };
    }

    turn = transitionAgentTurn(turn, hub.pausedForUser ? "waiting_approval" : "observing");
    turn = transitionAgentTurn(turn, "verifying");
    emit(input.onTurnEvent, createAgentTurnEvent("VERIFICATION_STARTED", "최종 상태를 다시 확인합니다."));

    const after = inspectAfterExecute({
      draft: hub.draft,
      snapshot: hub.snapshot,
      connections: input.hub.connections,
      understand: understood,
    });
    const testsPassed =
      hub.intent === "test" || turn.actions.some((a) => a.tool === "test.run")
        ? hub.ok
        : hub.intent === "inspect"
          ? true
          : turn.actions.some((a) => a.tool === "test.run")
            ? hub.ok
            : null;
    const verification = verifyAgentTurn({
      turn,
      understand: understood,
      before,
      after,
      testsPassed,
      browserTest: browserTestStatusFromActions(turn.actions),
    });
    turn = { ...turn, inspection: after, verification };

    const vDecision = decideAfterVerification({
      passed: verification.passed,
      replanCount: turn.replanCount,
      maxReplans: limits.maxReplans,
    });
    turn = { ...turn, decisions: [...turn.decisions, vDecision] };

    if (verification.passed) {
      emit(input.onTurnEvent, createAgentTurnEvent("VERIFICATION_PASSED", verification.detailKo));
    } else {
      emit(input.onTurnEvent, createAgentTurnEvent("VERIFICATION_FAILED", verification.detailKo));
    }

    const status = hub.pausedForUser
      ? "waiting"
      : turn.paused
        ? "paused"
        : verification.passed
          ? "success"
          : hub.ok
            ? "partial"
            : "failed";

    turn = transitionAgentTurn(turn, status === "failed" ? "failed" : "completed");
    const report = generateFinalReport({
      turn,
      understand: understood,
      after,
      verification,
      status,
    });
    turn = { ...transitionAgentTurn(turn, "reported"), report, finalResult: { status, ok: verification.passed } };
    rememberAgentTurn({ platformId: sessionId, understand: understood, turn, report });

    emit(
      input.onTurnEvent,
      createAgentTurnEvent(
        status === "failed" ? "AGENT_FAILED" : "AGENT_COMPLETED",
        report.headlineKo,
      ),
    );
    emit(input.onTurnEvent, createAgentTurnEvent("FINAL_REPORT_CREATED", report.headlineKo));
    input.onHubEvent?.({ type: "final_report", report });
    return { turn, report, reportKo: formatFinalReportKo(report), hub, travel: null };
  }

  if (input.travel) {
    turn = transitionAgentTurn(turn, "planning");
    turn = transitionAgentTurn(turn, "executing");
    const travelResult = await runAgentController(input.travel);
    travel = travelResult.ok ? travelResult : null;
    turn = transitionAgentTurn(turn, "verifying");
    const report = generateFinalReport({
      turn,
      understand: understood,
      after: null,
      verification: {
        passed: Boolean(travel?.ok),
        ran: true,
        browserTest: "skipped",
        checks: [
          {
            id: "travel",
            labelKo: "요청 처리",
            group: "flow",
            passed: Boolean(travel?.ok),
            evidence: travel?.assistantReplyKo ?? "no plan",
          },
        ],
        failedReasons: travel?.ok ? [] : ["실행 결과를 확인하지 못했습니다."],
        detailKo: travel?.assistantReplyKo ?? "",
      },
      status: travel?.ok ? "success" : "failed",
    });
    turn = { ...transitionAgentTurn(turn, "reported"), report };
    emit(input.onTurnEvent, createAgentTurnEvent("FINAL_REPORT_CREATED", report.headlineKo));
    return { turn, report, reportKo: formatFinalReportKo(report), hub: null, travel };
  }

  const report = generateFinalReport({
    turn,
    understand: understood,
    after: null,
    verification: null,
    status: "failed",
  });
  turn = { ...transitionAgentTurn(turn, "reported"), report };
  return { turn, report, reportKo: formatFinalReportKo(report), hub: null, travel: null };
}
