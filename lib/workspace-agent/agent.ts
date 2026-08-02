/**
 * Workspace Reality Agent — Operator inside Active Workspace only.
 *
 * Observe → Read Context → Intent → Plan → Draft → Validate → Request Apply
 * Never manipulates whole Globe. Never Reality Commits.
 */

import { generateWorkspaceAgentAction } from "@/lib/workspace-agent/action-generator";
import { readWorkspaceAgentContext } from "@/lib/workspace-agent/context-reader";
import {
  buildWorkspaceAgentPlan,
  isWorkspaceAgentCommitForbidden,
  understandWorkspaceAgentIntent,
} from "@/lib/workspace-agent/planner";
import type { WorkspaceAgentResult } from "@/lib/workspace-agent/types";
import {
  assertNoRealityCommitFromAgent,
  validateWorkspaceAgentImpact,
} from "@/lib/workspace-agent/validator";

export function runWorkspaceRealityAgent(input: {
  readonly workspaceId: string;
  readonly utterance: string;
}): WorkspaceAgentResult {
  const workspaceId = input.workspaceId.trim();
  const utterance = input.utterance.trim();
  if (!workspaceId || !utterance) {
    return {
      ok: false,
      reasonKo: "Workspace / 발화가 없어요",
      inactiveWorkspace: !workspaceId,
      realityCommitAttempted: false,
    };
  }

  assertNoRealityCommitFromAgent("draft");

  if (isWorkspaceAgentCommitForbidden(utterance)) {
    return {
      ok: false,
      reasonKo: "Reality Commit은 Agent 범위 밖이에요 · Field에서 확정하세요",
      inactiveWorkspace: false,
      realityCommitAttempted: true,
    };
  }

  // Observe + Read Workspace Context
  const observed = readWorkspaceAgentContext(workspaceId);
  if (!observed.ok) {
    return {
      ok: false,
      reasonKo: observed.reasonKo,
      inactiveWorkspace: true,
      realityCommitAttempted: false,
    };
  }
  const { context } = observed;

  // Understand User Intent
  const intent = understandWorkspaceAgentIntent({
    workspaceId,
    utterance,
    context,
  });
  if (!intent) {
    return {
      ok: false,
      reasonKo: "Workspace에서 다룰 Intent를 못 찾았어요",
      inactiveWorkspace: false,
      realityCommitAttempted: false,
    };
  }

  // Generate Action Plan
  const plan = buildWorkspaceAgentPlan({ intent, context, utterance });

  // Create Draft Action (proposed only)
  const generated = generateWorkspaceAgentAction({
    workspaceId,
    utterance,
    context,
    plan,
  });

  // Validate Impact
  const validation = validateWorkspaceAgentImpact({
    proposal: generated.proposal,
    utterance,
  });
  if (!validation.ok) {
    return {
      ok: false,
      reasonKo: validation.reasonKo,
      inactiveWorkspace: false,
      realityCommitAttempted: true,
    };
  }

  // Request Apply — return proposal; user must Apply (UI / applyDraftMutation)
  const hotelLine = context.currentHotel
    ? `Current · ${context.currentHotel.title}${
        context.currentHotel.priceLabelKo
          ? ` · ${context.currentHotel.priceLabelKo}`
          : ""
      }`
    : "Current · 숙소 미선택";

  const altLine =
    generated.alternativesKo.length > 0
      ? `대체 후보 · ${generated.alternativesKo.join(", ")}`
      : "대체 후보 · Workspace에서 탐색";

  const simLines = generated.simulation
    ? [
        "Simulation · SIMULATION_ONLY",
        ...generated.simulation.impact.linesKo,
      ]
    : null;

  const summaryKo = [
    `Context · ${context.contextTitleKo}`,
    hotelLine,
    context.notesKo.find((n) => /가격/u.test(n)) ?? null,
    plan.summaryKo,
    altLine,
    ...(simLines ?? []),
    "Draft 준비됨 · [적용] 대기 · Reality Commit 없음",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ok: true,
    phase: "request_apply",
    context,
    intent,
    plan,
    proposal: generated.proposal,
    validation,
    summaryKo,
    proposalKind: generated.proposalKind,
    simulation: generated.simulation,
  };
}
