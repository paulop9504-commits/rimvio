export {
  LOOP_CORE_KINDS,
  LOOP_CAPABILITY_KINDS,
  LOOP_DATA_KINDS,
  LOOP_NODE_KINDS,
  type LoopNodeKind,
  type LoopEdgeKind,
  type LoopNode,
  type LoopNodeConfig,
  type LoopEdge,
  type LoopDefinition,
  type LoopLintIssue,
  type LoopLintCheck,
  type LoopLintResult,
  type LoopTraceStep,
  type LoopTestResult,
  type AgentCapabilityPackage,
  type LoopBuilderMode,
} from "@/lib/agent-os/loop-builder/types";

export {
  LOOP_PALETTE,
  EXECUTING_KINDS,
  isLoopExecutingNode,
  createLoopNode,
  defaultLabelForKind,
} from "@/lib/agent-os/loop-builder/nodes";

export {
  LOOP_BLOCK_TEMPLATES,
  LOOP_BLOCK_TEMPLATE_CATEGORIES,
  listLoopBlockTemplates,
  getLoopBlockTemplate,
  type LoopBlockTemplate,
  type LoopBlockTemplateCategory,
} from "@/lib/agent-os/loop-builder/block-templates";

export {
  CUSTOM_BLOCK_CODE_STUB,
  createNodeFromTemplate,
  applyTemplateToNode,
  validateCustomBlockCode,
  nodeHasExecutableCode,
  nodeToBlockCode,
  parseBlockCodeSnippet,
} from "@/lib/agent-os/loop-builder/custom-block";

export { lintLoopDefinition } from "@/lib/agent-os/loop-builder/lint";
export { generateLoopFromUtterance, wrapCapabilityAsLoop } from "@/lib/agent-os/loop-builder/generate";
export { loopDefinitionToCode, parseLoopCode, roundTripCode } from "@/lib/agent-os/loop-builder/code-mode";
export { compileLoopToRuntimeSteps, type CompiledLoopStep } from "@/lib/agent-os/loop-builder/compile";
export { testLoopDefinition } from "@/lib/agent-os/loop-builder/run-loop";
export { packageLoopAsCapability } from "@/lib/agent-os/loop-builder/package";
export {
  readLoopDefinition,
  writeLoopDefinition,
  subscribeLoopDefinitionUpdates,
  resetLoopDefinitionsForTests,
  LOOP_DEFINITION_UPDATED_EVENT,
} from "@/lib/agent-os/loop-builder/store";
