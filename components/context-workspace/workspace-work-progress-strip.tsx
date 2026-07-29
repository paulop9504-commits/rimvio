"use client";

/**
 * @deprecated Prefer WorkspaceAgentStatusPanel (ADR-039).
 * Kept as thin re-export so older imports keep working.
 */

export {
  WorkspaceAgentStatusPanel as WorkspaceWorkProgressStrip,
  type WorkspaceAgentStatusPanelProps as WorkspaceWorkProgressStripProps,
} from "@/components/context-workspace/workspace-agent-status-panel";
