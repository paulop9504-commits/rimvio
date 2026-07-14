import { primaryExecutionNodeForEngine } from "@/lib/engine/execution-graph-engine-bindings";

export {
  transitNavigateEnginePackage as transitNavigateEngine,
  TRANSIT_NAVIGATE_ENGINE_GOAL,
} from "@/lib/engine/packages/transit-navigate-package";

export const TRANSIT_NAVIGATE_EXECUTION_NODE_ID =
  primaryExecutionNodeForEngine("transit_navigate");
