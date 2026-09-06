export {
  parseHarness,
  assertHarness,
  validateHarness,
  validateHarnessGraph,
  serializeHarness,
  deserializeHarness,
  findNode,
  findAction,
  requiresApproval,
  type HarnessValidationIssue,
  type HarnessValidationResult,
} from "@/lib/harness/validate";

export {
  createInMemoryHarnessRepository,
  type HarnessRepository,
} from "@/lib/harness/repository";

export {
  createHarnessService,
  createEmptyHarnessDraft,
  appendNode,
  type HarnessService,
} from "@/lib/harness/service";

export {
  harnessExecutionStatusSchema,
  harnessActionExecutionLogSchema,
  harnessExecutionStateSchema,
  createHarnessExecutionState,
  type HarnessExecutionStatus,
  type HarnessActionExecutionLog,
  type HarnessExecutionState,
} from "@/lib/harness/execution-state";

export {
  HARNESS_LABELLING_STEPS,
  createSandboxLabellingDraft,
  applySandboxSurface,
  appendLabellingAction,
  updateLabellingOverview,
  setExtractFields,
  setLabellingVerifications,
  canAdvanceLabellingStep,
  surfaceToRuntimeType,
  runtimeTypeToSurface,
  type HarnessSandboxSurface,
  type HarnessLabellingStepId,
} from "@/lib/harness/labelling";

export {
  harnessToFlowNodes,
  harnessToFlowEdges,
  addHarnessBuilderNode,
  applyBuilderAssistantCommand,
  HARNESS_BUILDER_STEPS,
} from "@/lib/harness/builder-graph";

export { executeHarnessInBrowser, executeHarnessAction } from "@/lib/harness/execute-browser";
export { dispatchHarnessToLocalAgent } from "@/lib/harness/execute-local";
export { generateHarnessFromUtterance } from "@/lib/harness/nl-agent";

export type {
  Harness,
  HarnessNode,
  HarnessAction,
  HarnessPermission,
  HarnessConstraint,
  HarnessVerification,
  HarnessRuntime,
} from "@/lib/rimvio-protocol/harness";
