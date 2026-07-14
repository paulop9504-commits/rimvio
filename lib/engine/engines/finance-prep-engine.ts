import { primaryExecutionNodeForEngine } from "@/lib/engine/execution-graph-engine-bindings";

export {
  financePrepEnginePackage as financePrepEngine,
  FINANCE_PREP_ENGINE_GOAL,
} from "@/lib/engine/packages/finance-prep-package";

export const FINANCE_PREP_EXECUTION_NODE_ID =
  primaryExecutionNodeForEngine("finance_prep");
