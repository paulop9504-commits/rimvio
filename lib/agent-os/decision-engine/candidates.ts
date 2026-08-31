/**
 * Action candidates + deterministic scoring. LLM is not used here.
 */

import type {
  ActionCandidate,
  ActionScores,
  ApplicationStateSnapshot,
  CompiledGoal,
  CapabilityMeta,
} from "@/lib/agent-os/decision-engine/types";
import { listDecisionCapabilities } from "@/lib/agent-os/decision-engine/capability-catalog";
import { capabilityPresent } from "@/lib/agent-os/decision-engine/state-snapshot";

function scoreOf(
  meta: CapabilityMeta,
  goal: CompiledGoal,
  state: ApplicationStateSnapshot,
  alreadyPresent: boolean,
  missingDeps: readonly string[],
  intent: string,
): ActionScores {
  const covers = meta.postconditions.filter((p) =>
    goal.requirements.includes(p) || goal.subgoals.some((s) => s.requirement === p && !s.satisfied),
  ).length;
  const goalProgress = alreadyPresent ? 0 : Math.min(1, covers / Math.max(1, goal.requirements.length)) * 4;
  const dependencyFit = missingDeps.length === 0 ? 3 : Math.max(0, 3 - missingDeps.length);
  const stateCompatibility = alreadyPresent ? 0 : 2;
  const capabilityConfidence = meta.riskLevel === "low" ? 2 : meta.riskLevel === "medium" ? 1.4 : 0.6;
  const verificationStrength =
    meta.verificationStrategy === "e2e" ? 2 : meta.verificationStrategy === "sandbox_test" ? 1.5 : 1;
  const userIntentAlignment =
    (intent === "inspect" && meta.id === "workspace.inspect") ||
    (intent === "test" && meta.id === "test.run") ||
    (intent === "connect" && meta.id === "connection.connect")
      ? 4
      : covers > 0
        ? 2
        : 0.5;
  const riskPenalty = meta.riskLevel === "high" ? 4 : meta.riskLevel === "medium" ? 1 : 0;
  const costPenalty = meta.estimatedCost * 0.2;
  const mutationPenalty = alreadyPresent ? 5 : meta.reversible ? 0.2 : 1;

  return {
    goalProgress,
    dependencyFit,
    stateCompatibility,
    capabilityConfidence,
    verificationStrength,
    userIntentAlignment,
    riskPenalty,
    costPenalty,
    mutationPenalty,
  };
}

function total(s: ActionScores): number {
  return (
    s.goalProgress +
    s.dependencyFit +
    s.stateCompatibility +
    s.capabilityConfidence +
    s.verificationStrength +
    s.userIntentAlignment -
    s.riskPenalty -
    s.costPenalty -
    s.mutationPenalty
  );
}

export function discoverActionCandidates(input: {
  readonly goal: CompiledGoal;
  readonly state: ApplicationStateSnapshot;
  readonly intent: string;
}): readonly ActionCandidate[] {
  const out: ActionCandidate[] = [];
  for (const meta of listDecisionCapabilities()) {
    if (meta.id === "workspace.inspect" && input.intent !== "inspect") continue;
    if (meta.id === "test.run" && input.intent !== "test") continue;
    if (meta.id === "connection.connect" && input.intent !== "connect") continue;
    if (meta.id === "publish.request" && input.intent !== "publish") continue;
    if (meta.id === "capability.delete" && !/삭제|지워|delete/i.test(input.goal.objective)) continue;
    const domainOk =
      meta.supportedDomains.length === 0 ||
      meta.supportedDomains.includes(input.goal.domain) ||
      meta.supportedDomains.includes("platform") ||
      (input.intent === "inspect" && meta.id === "workspace.inspect") ||
      (input.intent === "test" && meta.id === "test.run") ||
      (input.intent === "connect" && meta.id === "connection.connect");
    if (!domainOk) continue;

    const alreadyPresent =
      meta.postconditions.length > 0 &&
      meta.postconditions.every((p) =>
        input.goal.subgoals.find((s) => s.requirement === p)?.satisfied ||
        capabilityPresent(input.state, p),
      ) &&
      meta.id !== "workspace.inspect" &&
      meta.id !== "test.run";

    const missingDeps = meta.preconditions.filter(
      (p) => !input.goal.subgoals.find((s) => s.requirement === p)?.satisfied && !capabilityPresent(input.state, p),
    );

    const scores = scoreOf(meta, input.goal, input.state, alreadyPresent, missingDeps, input.intent);
    out.push({
      actionId: meta.id,
      capabilityId: meta.id,
      toolId: meta.toolId,
      labelKo: meta.name,
      alreadyPresent,
      missingDeps,
      scores,
      total: total(scores),
    });
  }
  return [...out].sort((a, b) => b.total - a.total);
}

export function pickNextCandidate(
  candidates: readonly ActionCandidate[],
): ActionCandidate | null {
  const fresh = candidates.filter((c) => !c.alreadyPresent);
  if (fresh.length === 0) return null;
  const unblocked = fresh.find((c) => c.missingDeps.length === 0);
  if (unblocked) return unblocked;
  return fresh[0] ?? null;
}

export function firstMissingDependency(candidates: readonly ActionCandidate[]): string | null {
  for (const c of candidates) {
    if (!c.alreadyPresent && c.missingDeps.length > 0) return c.missingDeps[0] ?? null;
  }
  return null;
}
