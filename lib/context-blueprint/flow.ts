/**
 * Flow — Runtime progress sequence (v2 user/dev name).
 * Engineering wire: ExecutionGraph until schema rename.
 * @see docs/RIMVIO_CANONICAL_VOCABULARY_V2.md
 */

export type {
  ComposeExecutionGraphInput as ComposeFlowInput,
  ExecutionGraphEdge as FlowEdge,
  ExecutionGraphNode as FlowNode,
  ExecutionGraph as Flow,
  ExecutionNodeKind as FlowNodeKind,
  ExecutionNodeStatus as FlowNodeStatus,
} from "@/lib/context-blueprint/execution-graph";

export {
  composeExecutionGraph as composeFlow,
  EXECUTION_NODE_KINDS as FLOW_NODE_KINDS,
  EXECUTION_NODE_STATUSES as FLOW_NODE_STATUSES,
  readExecutionNodeById as readFlowNodeById,
  readExecutionNodesForExecutor as readFlowNodesForExecutor,
  readUnresolvedExecutionNodes as readUnresolvedFlowNodes,
} from "@/lib/context-blueprint/execution-graph";

/** @deprecated v1 user-facing — use Flow */
export type { ExecutionGraph } from "@/lib/context-blueprint/execution-graph";
