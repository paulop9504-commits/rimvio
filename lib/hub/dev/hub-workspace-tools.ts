/**
 * Hub Workspace Tool Gateway — Cursor-style read/mutate tools for Platform Builder.
 * SSOT for Agent Loop execute stage (ADR-045 spine extension, Hub context only).
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { buildProjectSnapshot, deriveProjectChanges, deriveProjectIssues } from "@/lib/hub/dev/dev-project-state";
import { validateDraftManifest } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import {
  observeHubWorkspace,
  observationLinesFromWorkspace,
  type HubWorkspaceFullState,
} from "@/lib/hub/dev/hub-workspace-observe";

export const HUB_WORKSPACE_TOOL_IDS = [
  "workspace.read",
  "workspace.inspect",
  "workspace.search",
  "capability.list",
  "capability.create",
  "capability.update",
  "capability.delete",
  "schema.read",
  "schema.update",
  "workflow.read",
  "workflow.create",
  "workflow.update",
  "permission.read",
  "permission.update",
  "connection.list",
  "connection.connect",
  "test.run",
  "preview.run",
  "deploy.prepare",
  "file.read",
  "file.write",
  "file.patch",
] as const;

export type HubWorkspaceToolId = (typeof HUB_WORKSPACE_TOOL_IDS)[number];

export type HubWorkspaceInspectResult = HubWorkspaceFullState & {
  readonly commerce: string;
};

export type HubConnectionState = {
  readonly id: string;
  readonly label: string;
  readonly connected: boolean;
};

export type HubWorkspaceToolResult =
  | { readonly ok: true; readonly toolId: HubWorkspaceToolId; readonly data: unknown }
  | { readonly ok: false; readonly toolId: HubWorkspaceToolId; readonly error: string };

export type HubWorkspaceToolContext = {
  readonly getDraft: () => PlatformDraft;
  readonly updateDraft: (patch: Partial<PlatformDraft>) => void;
  readonly snapshot: DevProjectSnapshot;
  readonly executor: DeployExecutorCallbacks;
  readonly connections: Readonly<Record<string, boolean>>;
};

function readInspect(ctx: HubWorkspaceToolContext): HubWorkspaceInspectResult {
  const state = observeHubWorkspace({
    draft: ctx.getDraft(),
    snapshot: ctx.snapshot,
    connections: ctx.connections,
  });
  return { ...state, commerce: state.commerce };
}

function listConnections(ctx: HubWorkspaceToolContext): HubConnectionState[] {
  return [
    { id: "github", label: "GitHub", connected: ctx.connections.github ?? true },
    { id: "openai", label: "OpenAI", connected: ctx.connections.openai ?? true },
    { id: "stripe", label: "Stripe", connected: ctx.connections.stripe ?? false },
    { id: "mcp", label: "MCP Server", connected: ctx.connections.mcp ?? false },
  ];
}

function hasCapability(draft: PlatformDraft, name: string): boolean {
  return draft.actions.some((a) => a.name === name);
}

function ensurePaymentCapabilities(draft: PlatformDraft): Partial<PlatformDraft> {
  const patch: Partial<PlatformDraft> = {};
  const actions = [...draft.actions];
  const permissions = [...draft.permissions];

  if (!hasCapability(draft, "payment.prepare")) {
    actions.push({
      id: `cap-payment-prepare-${Date.now()}`,
      name: "payment.prepare",
      description: "Prepare payment intent before user approval",
      inputSchema: '{"type":"object","properties":{"amountKrw":{"type":"number"}}}',
      outputSchema: '{"type":"object","properties":{"intentId":{"type":"string"}}}',
      approvalRequired: false,
    });
  }
  if (!hasCapability(draft, "payment.commit")) {
    actions.push({
      id: `cap-payment-commit-${Date.now()}`,
      name: "payment.commit",
      description: "Commit payment after approval token",
      inputSchema: '{"type":"object","properties":{"intentId":{"type":"string"},"approvalToken":{"type":"string"}}}',
      outputSchema: '{"type":"object","properties":{"status":{"type":"string"}}}',
      approvalRequired: true,
    });
  }

  if (!permissions.some((p) => p.id === "payment.commit" && p.enabled)) {
    permissions.push({
      id: "payment.commit",
      label: "Payment commit",
      scope: "payment.commit",
      whyNeeded: "Commit payment after user approval",
      risk: "high",
      enabled: true,
    });
  }

  patch.actions = actions;
  patch.permissions = permissions;
  patch.commerceNotes = draft.commerceNotes?.includes("Stripe")
    ? draft.commerceNotes
    : "Stripe Integration · payment.prepare → user approval → payment.commit";
  return patch;
}

function ensureApprovalGate(draft: PlatformDraft): Partial<PlatformDraft> {
  const actions = draft.actions.map((a) =>
    a.name === "payment.commit" ? { ...a, approvalRequired: true } : a,
  );
  const permissions = [...draft.permissions];
  if (!permissions.some((p) => p.id === "payment.commit" && p.enabled)) {
    permissions.push({
      id: "payment.commit",
      label: "Payment commit",
      scope: "payment.commit",
      whyNeeded: "User must approve before payment commits",
      risk: "high",
      enabled: true,
    });
  }
  return {
    actions,
    permissions,
    workflowDescription:
      draft.workflowDescription?.includes("approval")
        ? draft.workflowDescription
        : "payment.prepare → user approval → payment.commit",
  };
}

function ensureJourneyCapability(
  draft: PlatformDraft,
  journey: string,
): Partial<PlatformDraft> {
  const actions = [...draft.actions];
  const add = (name: string, description: string, approval: boolean) => {
    if (actions.some((a) => a.name === name)) return;
    actions.push({
      id: `cap-${name}-${Date.now()}`,
      name,
      description,
      inputSchema: "{}",
      outputSchema: `${name}.response.v1`,
      approvalRequired: approval,
    });
  };

  switch (journey) {
    case "auth":
      add("auth.signup", "User signup", false);
      break;
    case "hotel_search":
      add("hotel.search", "Search hotels", false);
      break;
    case "booking":
      add("booking.confirm", "Confirm booking", true);
      break;
    default:
      break;
  }
  return { actions };
}

export async function invokeHubWorkspaceTool(
  toolId: HubWorkspaceToolId,
  args: Record<string, unknown>,
  ctx: HubWorkspaceToolContext,
): Promise<HubWorkspaceToolResult> {
  try {
    switch (toolId) {
      case "workspace.read":
      case "workspace.inspect": {
        return { ok: true, toolId, data: readInspect(ctx) };
      }
      case "workspace.search": {
        const query = String(args.query ?? "").toLowerCase();
        const inspect = readInspect(ctx);
        const hits = inspect.capabilities.filter((c) => c.toLowerCase().includes(query));
        return { ok: true, toolId, data: { query, hits } };
      }
      case "capability.list": {
        return { ok: true, toolId, data: ctx.getDraft().actions.map((a) => a.name) };
      }
      case "capability.create": {
        const patch = args.patch as Partial<PlatformDraft> | undefined;
        if (!patch) {
          return { ok: false, toolId, error: "patch required" };
        }
        ctx.updateDraft(patch);
        return { ok: true, toolId, data: { applied: Object.keys(patch) } };
      }
      case "capability.update": {
        const patch = args.patch as Partial<PlatformDraft> | undefined;
        if (args.intent === "approval_gate") {
          ctx.updateDraft(ensureApprovalGate(ctx.getDraft()));
          return { ok: true, toolId, data: { applied: ["approval_gate"] } };
        }
        if (!patch) {
          return { ok: false, toolId, error: "patch required" };
        }
        ctx.updateDraft(patch);
        return { ok: true, toolId, data: { applied: Object.keys(patch) } };
      }
      case "capability.delete": {
        const name = String(args.capability ?? "");
        const draft = ctx.getDraft();
        const actions = draft.actions.filter((a) => a.name !== name);
        if (actions.length === draft.actions.length) {
          return { ok: false, toolId, error: `capability not found: ${name}` };
        }
        ctx.updateDraft({ actions });
        return { ok: true, toolId, data: { deleted: name } };
      }
      case "schema.read": {
        const name = String(args.capability ?? "");
        const action = ctx.getDraft().actions.find((a) => a.name === name);
        if (!action) {
          return { ok: false, toolId, error: `capability not found: ${name}` };
        }
        return {
          ok: true,
          toolId,
          data: { input: action.inputSchema, output: action.outputSchema },
        };
      }
      case "schema.update": {
        const name = String(args.capability ?? "");
        const draft = ctx.getDraft();
        const actions = draft.actions.map((a) => {
          if (a.name !== name) return a;
          let inputSchema = a.inputSchema;
          if (args.fixApprovalToken === true && !inputSchema.includes("approvalToken")) {
            inputSchema =
              '{"type":"object","properties":{"intentId":{"type":"string"},"approvalToken":{"type":"string"}}}';
          }
          if (typeof args.inputSchema === "string") {
            inputSchema = args.inputSchema;
          }
          let outputSchema = a.outputSchema;
          if (typeof args.outputSchema === "string") {
            outputSchema = args.outputSchema;
          }
          return { ...a, inputSchema, outputSchema };
        });
        const found = draft.actions.some((a) => a.name === name);
        if (!found) {
          return { ok: false, toolId, error: `capability not found: ${name}` };
        }
        ctx.updateDraft({ actions });
        return { ok: true, toolId, data: { capability: name, updated: true } };
      }
      case "workflow.read": {
        const draft = ctx.getDraft();
        return {
          ok: true,
          toolId,
          data: {
            description: draft.workflowDescription || "",
            capabilityCount: draft.actions.length,
          },
        };
      }
      case "workflow.create":
      case "workflow.update": {
        const description = String(args.description ?? args.workflow ?? "").trim();
        if (!description) {
          return { ok: false, toolId, error: "description required" };
        }
        ctx.updateDraft({ workflowDescription: description });
        return { ok: true, toolId, data: { workflowDescription: description } };
      }
      case "permission.read": {
        const draft = ctx.getDraft();
        return {
          ok: true,
          toolId,
          data: draft.permissions.map((p) => ({
            id: p.id,
            enabled: p.enabled,
            risk: p.risk,
          })),
        };
      }
      case "permission.update": {
        const permId = String(args.id ?? "");
        const enabled = args.enabled !== false;
        const draft = ctx.getDraft();
        const permissions = draft.permissions.map((p) =>
          p.id === permId ? { ...p, enabled } : p,
        );
        if (!draft.permissions.some((p) => p.id === permId)) {
          return { ok: false, toolId, error: `permission not found: ${permId}` };
        }
        ctx.updateDraft({ permissions });
        return { ok: true, toolId, data: { id: permId, enabled } };
      }
      case "connection.list": {
        return { ok: true, toolId, data: listConnections(ctx) };
      }
      case "connection.connect": {
        const provider = String(args.provider ?? "stripe");
        return {
          ok: true,
          toolId,
          data: {
            provider,
            status: "pending_oauth",
            messageKo: `${provider} 연결이 필요합니다.`,
          },
        };
      }
      case "test.run": {
        const result = await ctx.executor.runSandboxTest();
        const draft = ctx.getDraft();
        const snapshot = buildProjectSnapshot({
          draft,
          testsPassed: result.passed,
        });
        return {
          ok: true,
          toolId,
          data: {
            passed: snapshot.testsPassed,
            total: snapshot.testsTotal,
            ok: result.passed,
          },
        };
      }
      case "preview.run": {
        return { ok: true, toolId, data: { status: "ready", url: "/hub/workspace?pane=ade" } };
      }
      case "deploy.prepare": {
        const validation = validateDraftManifest(ctx.getDraft());
        return {
          ok: true,
          toolId,
          data: { valid: validation.valid, error: validation.error },
        };
      }
      case "file.read": {
        const path = String(args.path ?? "manifest.json");
        const draft = ctx.getDraft();
        return {
          ok: true,
          toolId,
          data: { path, content: JSON.stringify({ name: draft.name, actions: draft.actions.length }) },
        };
      }
      case "file.write": {
        const patch = args.patch as Partial<PlatformDraft> | undefined;
        if (!patch) {
          return { ok: false, toolId, error: "patch required" };
        }
        ctx.updateDraft(patch);
        return { ok: true, toolId, data: { path: String(args.path ?? "draft"), written: true } };
      }
      case "file.patch": {
        if (typeof args.journey === "string") {
          const patch = ensureJourneyCapability(ctx.getDraft(), args.journey);
          ctx.updateDraft(patch);
          return { ok: true, toolId, data: { journey: args.journey } };
        }
        if (args.payment === true || args.fixPaymentCommit === true) {
          const patch = ensurePaymentCapabilities(ctx.getDraft());
          ctx.updateDraft(patch);
          return { ok: true, toolId, data: { path: "src/capabilities/payment/commit.ts", fixed: true } };
        }
        const patch = args.patch as Partial<PlatformDraft> | undefined;
        if (patch) {
          ctx.updateDraft(patch);
          return { ok: true, toolId, data: { applied: true } };
        }
        return { ok: false, toolId, error: "patch required" };
      }
      default:
        return { ok: false, toolId, error: `unknown tool: ${toolId}` };
    }
  } catch (err) {
    return {
      ok: false,
      toolId,
      error: err instanceof Error ? err.message : "tool failed",
    };
  }
}

export function refreshSnapshotAfterPatch(
  draft: PlatformDraft,
  testsPassed: boolean,
): DevProjectSnapshot {
  return buildProjectSnapshot({ draft, testsPassed });
}

export function observationFromInspect(inspect: HubWorkspaceInspectResult): string[] {
  return observationLinesFromWorkspace(inspect);
}

export function issuesAfterDraft(draft: PlatformDraft): ReturnType<typeof deriveProjectIssues> {
  return deriveProjectIssues(draft);
}

export function changesAfterDraft(draft: PlatformDraft): ReturnType<typeof deriveProjectChanges> {
  return deriveProjectChanges(draft);
}
