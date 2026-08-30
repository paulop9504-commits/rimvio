/**
 * Rimvio Dev Agent OS — core types.
 * Canonical: docs/RIMVIO_DEV_AGENT_OS.md
 */

/** High-level dev task kinds — classify before execution. */
export type DevTaskKind =
  | "create"
  | "modify"
  | "debug"
  | "plan"
  | "connect"
  | "test"
  | "deploy"
  | "remove";

/** Mandatory development loop — BUILD is not the end. */
export const RIMVIO_DEV_DEVELOPMENT_LOOP = [
  "understand",
  "inspect",
  "plan",
  "design",
  "build",
  "connect",
  "test",
  "verify",
  "deploy",
  "monitor",
  "fix",
] as const;

export type DevDevelopmentPhase = (typeof RIMVIO_DEV_DEVELOPMENT_LOOP)[number];

export const DEV_DEVELOPMENT_PHASE_LABEL_KO: Record<DevDevelopmentPhase, string> = {
  understand: "Understand",
  inspect: "Inspect",
  plan: "Plan",
  design: "Design",
  build: "Build",
  connect: "Connect",
  test: "Test",
  verify: "Verify",
  deploy: "Deploy",
  monitor: "Monitor",
  fix: "Fix",
};

/** Rimvio product object model — Dev Agent mental model. */
export type RimvioPlatformModel = {
  readonly id: string;
  readonly name: string;
  readonly domain: string | null;
  readonly capabilities: readonly string[];
  readonly loops: readonly string[];
  readonly integrations: readonly string[];
};

export type RimvioCapabilityModel = {
  readonly id: string;
  readonly name: string;
  readonly reusable: boolean;
  readonly usedByPlatforms: readonly string[];
};

export type RimvioLoopModel = {
  readonly id: string;
  readonly name: string;
  readonly platformId: string | null;
  readonly steps: readonly string[];
};

export type RimvioWorkspaceModel = {
  readonly id: string;
  readonly platformId: string;
  readonly regions: readonly string[];
  readonly stateKeys: readonly string[];
};

/** Snapshot of current system — INSPECT phase input. */
export type CurrentSystemState = {
  readonly platforms: readonly RimvioPlatformModel[];
  readonly capabilities: readonly RimvioCapabilityModel[];
  readonly loops: readonly RimvioLoopModel[];
  readonly integrations: readonly string[];
  readonly workspaces: readonly RimvioWorkspaceModel[];
};

/** NL decomposition — UNDERSTAND + DESIGN output. */
export type ProductIntentDecomposition = {
  readonly intentSummary: string;
  readonly platform: { readonly id: string; readonly name: string; readonly domain: string | null };
  readonly capabilities: readonly string[];
  readonly loops: readonly string[];
  readonly workspaceFlow: readonly string[];
  readonly integrations: readonly string[];
  readonly stateKeys: readonly string[];
  readonly reuseCandidates: readonly string[];
  readonly createCandidates: readonly string[];
};

/** Internal task plan structure for complex work. */
export type DevAgentTaskPlan = {
  readonly intent: string;
  readonly taskKind: DevTaskKind;
  readonly affectedPlatforms: readonly string[];
  readonly affectedLoops: readonly string[];
  readonly affectedCapabilities: readonly string[];
  readonly uiChanges: readonly string[];
  readonly stateChanges: readonly string[];
  readonly backendChanges: readonly string[];
  readonly integrationChanges: readonly string[];
  readonly dependencies: readonly string[];
  readonly tests: readonly string[];
  readonly deployment: string | null;
};

/** Definition-of-done checklist. */
export type DefinitionOfDoneChecklist = {
  readonly intentUnderstood: boolean;
  readonly platformIdentified: boolean;
  readonly loopIdentifiedOrCreated: boolean;
  readonly capabilityIdentifiedOrCreated: boolean;
  readonly implementationCompleted: boolean;
  readonly uiCompleted: boolean;
  readonly stateConnected: boolean;
  readonly integrationsConnected: boolean;
  readonly userFlowTested: boolean;
  readonly errorsChecked: boolean;
  readonly existingBehaviorPreserved: boolean;
  readonly deploymentCompleted: boolean;
  readonly resultVerified: boolean;
};
