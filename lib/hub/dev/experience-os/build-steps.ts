/**
 * Visual Build sequence — same steps for UI progress and Resource API.
 */

export type ExperienceBuildStepId =
  | "workspace"
  | "repository"
  | "database"
  | "storage"
  | "auth"
  | "functions"
  | "ui"
  | "runtime"
  | "verification"
  | "preview";

export type ExperienceBuildStep = {
  readonly id: ExperienceBuildStepId;
  readonly label: string;
  readonly status: "pending" | "running" | "done" | "error";
  readonly detail?: string;
};

export const EXPERIENCE_BUILD_STEPS: readonly Omit<ExperienceBuildStep, "status">[] = [
  { id: "workspace", label: "Workspace created" },
  { id: "repository", label: "Repository created" },
  { id: "database", label: "Database created" },
  { id: "storage", label: "Storage created" },
  { id: "auth", label: "Authentication configured" },
  { id: "functions", label: "Functions created" },
  { id: "ui", label: "Building interface" },
  { id: "runtime", label: "Runtime started" },
  { id: "verification", label: "Verification" },
  { id: "preview", label: "Preview ready" },
];

export function initialBuildSteps(): ExperienceBuildStep[] {
  return EXPERIENCE_BUILD_STEPS.map((step) => ({ ...step, status: "pending" }));
}

export function markBuildStep(
  steps: readonly ExperienceBuildStep[],
  id: ExperienceBuildStepId,
  status: ExperienceBuildStep["status"],
  detail?: string,
): ExperienceBuildStep[] {
  return steps.map((step) => (step.id === id ? { ...step, status, detail } : step));
}

export function buildProgressPercent(steps: readonly ExperienceBuildStep[]): number {
  if (steps.length === 0) return 0;
  const done = steps.filter((s) => s.status === "done").length;
  return Math.round((done / steps.length) * 100);
}
