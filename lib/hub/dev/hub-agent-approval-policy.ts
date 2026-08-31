/**
 * Hub Agent approval policy — when to act autonomously vs ask vs require publish approval.
 *
 *        Agent
 *          │
 *    ┌─────┼─────┐
 *    ▼     ▼     ▼
 *  auto  ask   approve
 */

import type { HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";

export type HubAgentActionPolicy = "auto" | "ask_user" | "require_approval";

export function resolveHubAgentToolPolicy(
  toolId: HubWorkspaceToolId,
  args?: Record<string, unknown>,
): HubAgentActionPolicy {
  switch (toolId) {
    case "connection.connect":
      return "ask_user";
    case "deploy.prepare":
      return args?.publish === true ? "require_approval" : "auto";
    case "preview.run":
      return "auto";
    case "test.run":
    case "file.read":
    case "file.patch":
    case "file.write":
    case "schema.update":
    case "schema.read":
    case "capability.create":
    case "capability.update":
    case "capability.delete":
    case "workflow.create":
    case "workflow.update":
    case "permission.update":
    case "workspace.inspect":
    case "workspace.read":
    case "workspace.search":
    case "capability.list":
    case "workflow.read":
    case "permission.read":
    case "connection.list":
      return "auto";
    default:
      return "auto";
  }
}

export function resolveHubAgentPhasePolicy(phase: string): HubAgentActionPolicy {
  if (/publish|배포|출시|production/i.test(phase)) return "require_approval";
  if (/stripe|oauth|연결|connect/i.test(phase)) return "ask_user";
  return "auto";
}
