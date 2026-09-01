/**
 * Dev Hub Operator Turn — Spine ingress (operator, not chatbot SSOT).
 */

import { enterHubAgentRuntimeTurn } from "@/lib/hub/dev/hub-agent-runtime-ingress";
import { searchRegistry, ensureRegistryReady } from "../pipeline/publish";
import { invokePublishedCapability } from "../pipeline/invoke";
import { runToolLoop } from "../pipeline/tool-loop";
import {
  createInitialGoalState,
  readPersistedGoalState,
  resumeGoalWorkLog,
  syncPersistedGoalState,
} from "../persistence/goal-state";
import type { OperatorTurnInput, OperatorTurnResult } from "../types";

const RESUME_KEYWORDS = ["계속", "진행", "이어", "resume", "continue"];

function wantsResume(utterance: string): boolean {
  const lower = utterance.toLowerCase();
  return RESUME_KEYWORDS.some((kw) => lower.includes(kw));
}

function resolveCapabilityFromUtterance(utterance: string): string {
  const lower = utterance.toLowerCase();
  if (lower.includes("product") || lower.includes("macbook") || lower.includes("상품")) {
    return "product.search";
  }
  if (lower.includes("detail") || lower.includes("상세")) {
    return "hotel.detail";
  }
  if (lower.includes("workspace") || lower.includes("작업장") || lower.includes("patch")) {
    return "workspace.patch.apply";
  }
  if (lower.includes("graph") || lower.includes("연결")) {
    return "graph.connect";
  }
  if (lower.includes("api") || lower.includes("http")) {
    return "api.http.get";
  }
  const hits = searchRegistry(utterance);
  if (hits[0]?.capabilityId) {
    return hits[0].capabilityId;
  }
  return "hotel.search";
}

function buildSandboxInput(capabilityId: string, utterance: string): Record<string, unknown> {
  if (capabilityId === "product.search") {
    return { query: utterance.includes("macbook") ? "MacBook" : "laptop", limit: 5 };
  }
  if (capabilityId === "hotel.detail") {
    return { hotelId: "grand-osaka" };
  }
  if (capabilityId.startsWith("workspace.")) {
    return { workspaceId: undefined, utterance };
  }
  if (capabilityId.startsWith("graph.")) {
    return { fromId: "node-a", toId: "node-b", relation: "near" };
  }
  if (capabilityId.startsWith("api.http")) {
    const port = process.env.PORT ?? "3000";
    return { url: `http://127.0.0.1:${port}/api/agent-platform/capabilities` };
  }
  return {
    location: "오사카, 일본",
    checkIn: "2024-06-01",
    checkOut: "2024-06-03",
    guests: "2",
  };
}

export async function runDevHubOperatorTurn(
  input: OperatorTurnInput,
): Promise<OperatorTurnResult> {
  await ensureRegistryReady();
  const platformId = input.platformId.trim() || "dev";
  const contextEventId = input.contextEventId?.trim() || `hub:workspace:${platformId}`;
  const utterance = input.utterance.trim();

  if (wantsResume(utterance)) {
    const resumeLine = resumeGoalWorkLog(contextEventId);
    const goal = readPersistedGoalState(contextEventId);
    const nextCap = goal?.pendingCapabilityIds[0] ?? "execution.resume";

    if (input.autoExecute !== false) {
      const invokeResult = await invokePublishedCapability({
        capabilityId: goal?.compositeLoopId ? "execution.resume" : nextCap,
        input: { workspaceId: contextEventId, platformId },
        userRequest: utterance,
        contextEventId,
        platformId,
        syncGoal: true,
        toolLoop: true,
      });
      return {
        ok: invokeResult.ok,
        contextEventId,
        strategy: "planning",
        goalKo: goal?.goalKo ?? "작업 재개",
        capabilityId: nextCap,
        steps: [
          { stage: "observe", label: "Goal State 읽기", done: true },
          { stage: "plan", label: `Resume ${nextCap}`, done: true },
          { stage: "execute", label: "Invoke", done: true },
          { stage: "verify", label: "Verify", done: invokeResult.ok },
        ],
        invoke: invokeResult,
        workLogKo: invokeResult.workLogKo ?? resumeLine ?? "재개 완료",
      };
    }

    return {
      ok: true,
      contextEventId,
      strategy: "planning",
      goalKo: goal?.goalKo ?? "작업 재개",
      capabilityId: nextCap,
      steps: [
        { stage: "observe", label: "Goal State 읽기", done: true },
        { stage: "plan", label: `Resume ${nextCap}`, done: true },
        { stage: "execute", label: "Invoke", done: false },
      ],
      workLogKo: resumeLine ?? "재개할 Goal State가 없어요.",
    };
  }

  const spine = enterHubAgentRuntimeTurn({ utterance, platformId });
  const strategy = spine.strategy;
  const goalKo = spine.goalKo ?? utterance.slice(0, 120);
  const capabilityId = resolveCapabilityFromUtterance(utterance);

  syncPersistedGoalState(
    createInitialGoalState({
      contextEventId,
      goalKo,
      utterance,
      capabilityId,
    }),
  );

  const steps: Array<{ stage: string; label: string; done: boolean }> = [
    { stage: "observe", label: "Spine Observe", done: true },
    { stage: "judge", label: `Strategy · ${strategy}`, done: true },
    { stage: "plan", label: `Capability · ${capabilityId}`, done: true },
    { stage: "execute", label: "Invoke pipeline", done: false },
    { stage: "verify", label: "Verify output", done: false },
  ];

  let invokeResult;
  if (input.autoExecute !== false) {
    invokeResult = await runToolLoop({
      capabilityId,
      input: buildSandboxInput(capabilityId, utterance),
      userRequest: utterance,
      contextEventId,
      platformId,
      syncGoal: true,
      toolLoop: true,
    });
    steps[3] = { ...steps[3]!, done: true };
    steps[4] = { ...steps[4]!, done: invokeResult.ok };
  }

  return {
    ok: true,
    contextEventId,
    strategy,
    goalKo,
    capabilityId,
    steps,
    invoke: invokeResult,
    workLogKo: invokeResult?.workLogKo ?? `${goalKo} · ${capabilityId} 준비`,
  };
}
