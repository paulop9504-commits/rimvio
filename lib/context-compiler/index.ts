/**
 * Context Compiler — Reality Parser (ADR-023).
 */

export type {
  CompilerActionId,
  CompilerConstraintBag,
  CompilerEntity,
  CompilerEntityType,
  CompilerGraphEdge,
  CompilerGraphEdgeKind,
  CompilerGraphNode,
  CompilerIntentGraph,
  CompilerPreferenceVector,
  CompilerRealityState,
  CompilerTimeContext,
  ContextCompilerIrV1,
} from "@/lib/context-compiler/types";
export { CONTEXT_COMPILER_IR_VERSION } from "@/lib/context-compiler/types";

export {
  compileContextFromUtterance,
  type CompileContextInput,
} from "@/lib/context-compiler/compile-context-from-utterance";

export {
  deriveWorkspaceRelationshipEdges,
  sessionGraphToCompilerGraph,
  type WorkspaceRelNode,
} from "@/lib/context-compiler/derive-relationship-edges";
