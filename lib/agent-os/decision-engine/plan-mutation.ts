/**
 * Plan mutation — keep completed steps; insert new requirements.
 */

export type MutablePlanStep = {
  readonly id: string;
  readonly label: string;
  readonly status: "done" | "running" | "pending" | "failed";
};

export function mutatePlanSteps(input: {
  readonly steps: readonly MutablePlanStep[];
  readonly requirementLabel: string;
}): readonly MutablePlanStep[] {
  const exists = input.steps.some((s) =>
    s.label.toLowerCase().includes(input.requirementLabel.toLowerCase().slice(0, 8)),
  );
  if (exists) return input.steps;

  const insertAfter = input.steps.findIndex((s) => /menu|메뉴/.test(s.label));
  const next: MutablePlanStep = {
    id: `mut-${input.steps.length + 1}`,
    label: input.requirementLabel,
    status: "pending",
  };
  if (insertAfter >= 0) {
    return [...input.steps.slice(0, insertAfter + 1), next, ...input.steps.slice(insertAfter + 1)];
  }
  const lastDone = [...input.steps].reverse().findIndex((s) => s.status === "done");
  if (lastDone >= 0) {
    const idx = input.steps.length - lastDone;
    return [...input.steps.slice(0, idx), next, ...input.steps.slice(idx)];
  }
  return [...input.steps, next];
}

export function shouldReplan(input: {
  readonly actionFailed?: boolean;
  readonly verificationFailed?: boolean;
  readonly stateMismatch?: boolean;
  readonly missingDependency?: boolean;
  readonly capabilityUnavailable?: boolean;
  readonly userRequirementChanged?: boolean;
  readonly betterPath?: boolean;
  readonly goalImpossible?: boolean;
}): boolean {
  return Boolean(
    input.actionFailed ||
      input.verificationFailed ||
      input.stateMismatch ||
      input.missingDependency ||
      input.capabilityUnavailable ||
      input.userRequirementChanged ||
      input.betterPath ||
      input.goalImpossible,
  );
}
