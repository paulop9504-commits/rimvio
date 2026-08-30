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
import { observeFullWorkspace } from "@/lib/agent/hub-observation";
import {
  listHubPlatformConnections,
  verifyHubPlatformConnection,
  type HubConnectionFlags,
} from "@/lib/integrations/hub-platform/connection-manager";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import {
  defaultPublishOptionsForDraft,
  evaluatePublishGate,
} from "@/lib/hub/dev/hub-publish-flow";
import { applyManifestSyncPatch } from "@/lib/hub/dev/hub-verify-repair";
import {
  exportDraftToSourceFiles,
  syncPlatformBidirectional,
} from "@/lib/hub/dev/platform-source-sync";
import {
  listSandboxFiles,
  readSandboxFile,
  searchSandboxFiles,
  searchSandboxSymbols,
  patchSandboxFile,
  isSandboxPathAllowed,
} from "@/lib/hub/dev/coding-agent/coding-sandbox";
import { isCodingToolId } from "@/lib/hub/dev/coding-agent/coding-tool-ids";
import { invokeCodingToolBrowser } from "@/lib/hub/dev/coding-agent/invoke-coding-tools-browser";
import {
  invokeExperienceResource,
  parseResourceOpFromUtterance,
  type ExperienceResourceOp,
} from "@/lib/hub/dev/experience-os";
import { readExperienceActor } from "@/lib/experience-app";

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
  "connection.verify",
  "test.run",
  "preview.run",
  "deploy.prepare",
  "publish.request",
  "file.read",
  "file.write",
  "file.patch",
  "code.listFiles",
  "code.searchFiles",
  "code.readFile",
  "code.modifyFile",
  "code.searchSymbol",
  "code.findReferences",
  "code.createFile",
  "code.deleteFile",
  "code.transform",
  "code.findDefinition",
  "code.analyzeImports",
  "code.callGraph",
  "repo.clone",
  "repo.status",
  "test.discover",
  "test.generate",
  "test.e2e",
  "lint.run",
  "typecheck.run",
  "server.start",
  "server.stop",
  "server.status",
  "resource.apply",
  "verification.run",
  "terminal.run",
  "build.run",
  "platform.sync",
  "loop.create",
  "loop.test",
  "loop.read",
  "loop.lint",
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
  readonly repoRoot?: string;
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
  const flags: HubConnectionFlags = {
    github: ctx.connections.github ?? true,
    openai: ctx.connections.openai ?? true,
    stripe: ctx.connections.stripe ?? false,
    vercel: ctx.connections.vercel ?? true,
    mcp: ctx.connections.mcp ?? false,
  };
  const { connections } = listHubPlatformConnections(flags);
  return connections.map((c) => ({
    id: c.id,
    label: c.label,
    connected: c.status !== "not_connected",
  }));
}

function hasCapability(draft: PlatformDraft, name: string): boolean {
  return draft.actions.some((a) => a.name === name);
}

function ensureCapability(draft: PlatformDraft, name: string): Partial<PlatformDraft> {
  if (hasCapability(draft, name)) return {};
  const actions = [
    ...draft.actions,
    {
      id: `cap-${name.replace(/\./g, "-")}-${Date.now()}`,
      name,
      description: `${name} capability`,
      inputSchema: '{"type":"object","properties":{}}',
      outputSchema: `${name}.response.v1`,
      approvalRequired: name.includes("payment.commit") || name.includes("booking.confirm"),
    },
  ];
  return { actions };
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
    if (
      isCodingToolId(toolId) ||
      (ctx.repoRoot && (toolId.startsWith("code.") || toolId === "test.run" || toolId === "build.run"))
    ) {
      return invokeCodingToolBrowser(toolId, args, ctx);
    }
    switch (toolId) {
      case "workspace.read":
      case "workspace.inspect": {
        const full = observeFullWorkspace({
          draft: ctx.getDraft(),
          snapshot: ctx.snapshot,
          connections: ctx.connections,
        });
        return { ok: true, toolId, data: { ...readInspect(ctx), observation: full } };
      }
      case "workspace.search": {
        const query = String(args.query ?? "").toLowerCase();
        const inspect = readInspect(ctx);
        const extra = (args.capabilities as string[] | undefined) ?? [];
        const hits = [
          ...new Set([
            ...inspect.capabilities.filter((c) => c.toLowerCase().includes(query)),
            ...extra.filter((c) => inspect.capabilities.includes(c) || c.includes(".")),
          ]),
        ];
        return { ok: true, toolId, data: { query, hits, related: extra } };
      }
      case "capability.list": {
        return { ok: true, toolId, data: ctx.getDraft().actions.map((a) => a.name) };
      }
      case "capability.create": {
        const name = String(args.capability ?? args.name ?? "");
        if (name) {
          const patch = ensureCapability(ctx.getDraft(), name);
          if (Object.keys(patch).length) ctx.updateDraft(patch);
          return { ok: true, toolId, data: { created: name } };
        }
        const patch = args.patch as Partial<PlatformDraft> | undefined;
        if (!patch) {
          return { ok: false, toolId, error: "patch or capability name required" };
        }
        ctx.updateDraft(patch);
        return { ok: true, toolId, data: { applied: Object.keys(patch) } };
      }
      case "capability.update": {
        const capName = String(args.capability ?? "");
        if (capName && args.approvalRequired === true) {
          const actions = ctx.getDraft().actions.map((a) =>
            a.name === capName ? { ...a, approvalRequired: true } : a,
          );
          if (!ctx.getDraft().actions.some((a) => a.name === capName)) {
            return { ok: false, toolId, error: `capability not found: ${capName}` };
          }
          ctx.updateDraft({ actions });
          return { ok: true, toolId, data: { capability: capName, approvalRequired: true } };
        }
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
        const flags: HubConnectionFlags = {
          github: ctx.connections.github ?? false,
          openai: ctx.connections.openai ?? false,
          stripe: ctx.connections.stripe ?? false,
          vercel: ctx.connections.vercel ?? false,
          supabase: ctx.connections.supabase ?? false,
          mcp: ctx.connections.mcp ?? false,
        };
        const result = listHubPlatformConnections(flags);
        return { ok: true, toolId, data: result };
      }
      case "connection.verify": {
        const provider = String(args.provider ?? "stripe") as HubPlatformProviderId;
        const flags: HubConnectionFlags = {
          github: ctx.connections.github ?? false,
          openai: ctx.connections.openai ?? false,
          stripe: ctx.connections.stripe ?? false,
          vercel: ctx.connections.vercel ?? false,
          supabase: ctx.connections.supabase ?? false,
          mcp: ctx.connections.mcp ?? false,
        };
        const verified = verifyHubPlatformConnection(provider, flags);
        return { ok: true, toolId, data: verified };
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
        const { dispatchHubWorkspaceCommand } = await import("@/lib/hub/dev/hub-workspace-commands");
        dispatchHubWorkspaceCommand({ kind: "open_pane", pane: "tests" });
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
        const { dispatchHubWorkspaceCommand } = await import("@/lib/hub/dev/hub-workspace-commands");
        dispatchHubWorkspaceCommand({ kind: "open_preview" });
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
      case "publish.request": {
        const { dispatchHubWorkspaceCommand } = await import("@/lib/hub/dev/hub-workspace-commands");
        dispatchHubWorkspaceCommand({ kind: "open_pane", pane: "deploy" });
        const allTestsPassed =
          ctx.snapshot.testsTotal > 0 && ctx.snapshot.testsPassed === ctx.snapshot.testsTotal;
        const gate = evaluatePublishGate({
          draft: ctx.getDraft(),
          testsPassed: allTestsPassed,
          options: defaultPublishOptionsForDraft(ctx.getDraft()),
        });
        return { ok: true, toolId, data: gate };
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
        if (args.syncManifest === true) {
          ctx.updateDraft(applyManifestSyncPatch(ctx.getDraft()));
          return { ok: true, toolId, data: { path: "rimvio.platform.manifest.json", synced: true } };
        }
        const patch = args.patch as Partial<PlatformDraft> | undefined;
        if (patch) {
          ctx.updateDraft(patch);
          return { ok: true, toolId, data: { applied: true } };
        }
        return { ok: false, toolId, error: "patch required" };
      }
      case "code.listFiles": {
        const files = listSandboxFiles(ctx.getDraft());
        return { ok: true, toolId, data: { files: files.map((f) => f.path) } };
      }
      case "code.searchFiles": {
        const query = String(args.query ?? "");
        const files = searchSandboxFiles({ draft: ctx.getDraft(), query });
        return { ok: true, toolId, data: { query, hits: files.map((f) => f.path) } };
      }
      case "code.readFile": {
        const file = readSandboxFile({
          draft: ctx.getDraft(),
          path: String(args.path ?? ""),
          capability: args.capability ? String(args.capability) : undefined,
        });
        if (!file) {
          return { ok: false, toolId, error: "path not allowed or not found" };
        }
        return { ok: true, toolId, data: file };
      }
      case "code.searchSymbol":
      case "code.findReferences": {
        const symbol = String(args.symbol ?? args.query ?? args.capability ?? "");
        const hits = searchSandboxSymbols({
          draft: ctx.getDraft(),
          symbol: symbol || String(args.capability ?? ""),
          capability: args.capability ? String(args.capability) : undefined,
        });
        return { ok: true, toolId, data: { symbol, hits } };
      }
      case "code.modifyFile": {
        const patched = patchSandboxFile({
          draft: ctx.getDraft(),
          path: args.path ? String(args.path) : undefined,
          capability: args.capability ? String(args.capability) : undefined,
          sort: args.sort ? String(args.sort) : undefined,
          symbol: args.symbol ? String(args.symbol) : undefined,
        });
        if (!patched) {
          return { ok: false, toolId, error: "modify failed — path not in sandbox" };
        }
        if (args.capability && typeof args.capability === "string") {
          ctx.updateDraft(ensureCapability(ctx.getDraft(), String(args.capability)));
        }
        if (args.sort === "price") {
          const draft = ctx.getDraft();
          const actions = draft.actions.map((a) =>
            a.name === "hotel.search"
              ? { ...a, description: `${a.description} · price sort enabled` }
              : a,
          );
          ctx.updateDraft({ actions });
        }
        return {
          ok: true,
          toolId,
          data: {
            path: patched.path,
            linesAdded: patched.linesAdded,
            linesRemoved: patched.linesRemoved,
          },
        };
      }
      case "terminal.run":
      case "build.run": {
        const cmd = String(args.command ?? (toolId === "build.run" ? "npm run build" : "npm test"));
        const blocked = /rm\s+-rf|drop\s+table|publish|deploy\s+prod/i.test(cmd);
        if (blocked) {
          return { ok: false, toolId, error: "command blocked by policy — requires approval" };
        }
        if (toolId === "terminal.run" && /npm test|test/.test(cmd)) {
          const result = await ctx.executor.runSandboxTest();
          return { ok: true, toolId, data: { command: cmd, exitCode: result.passed ? 0 : 1, stdout: "sandbox test" } };
        }
        return { ok: true, toolId, data: { command: cmd, exitCode: 0, stdout: "ok (sandbox)" } };
      }
      case "resource.apply": {
        const parsed =
          typeof args.op === "string"
            ? { op: args.op as ExperienceResourceOp, args }
            : parseResourceOpFromUtterance(String(args.utterance ?? ""));
        if (!parsed) {
          return { ok: false, toolId, error: "resource op required" };
        }
        const result = await invokeExperienceResource(parsed.op, parsed.args, {
          draft: ctx.getDraft(),
          updateDraft: ctx.updateDraft,
          actor: readExperienceActor(),
        });
        return result.ok
          ? { ok: true, toolId, data: result.data }
          : { ok: false, toolId, error: result.errorKo ?? "resource failed" };
      }
      case "verification.run": {
        const result = await invokeExperienceResource("verification.run", args, {
          draft: ctx.getDraft(),
          updateDraft: ctx.updateDraft,
          actor: readExperienceActor(),
        });
        return result.ok
          ? { ok: true, toolId, data: result.data }
          : { ok: false, toolId, error: result.errorKo ?? "verification failed" };
      }
      case "platform.sync": {
        const direction = String(args.direction ?? "export");
        if (direction === "export") {
          const files = exportDraftToSourceFiles(ctx.getDraft());
          return { ok: true, toolId, data: { direction, fileCount: files.length, paths: files.map((f) => f.path) } };
        }
        const inbound = (args.files as Array<{ path: string; content: string }> | undefined) ?? [];
        const result = syncPlatformBidirectional({
          draft: ctx.getDraft(),
          inboundFiles: inbound.map((f) => ({
            path: f.path,
            content: f.content,
            kind: "capability" as const,
            objectId: f.path,
          })),
        });
        ctx.updateDraft(result.draft);
        if (result.conflicts.length > 0) {
          return {
            ok: false,
            toolId,
            error: result.conflicts.map((c) => c.reasonKo).join(" · "),
          };
        }
        return {
          ok: true,
          toolId,
          data: {
            direction: "import",
            syncedPaths: result.syncedPaths,
            conflicts: result.conflicts,
            fileCount: result.files.length,
          },
        };
      }
      case "loop.create": {
        const { invokeLoopCreateTool } = await import("@/lib/hub/dev/hub-loop-agent");
        const created = invokeLoopCreateTool(args, ctx);
        return created.ok
          ? { ok: true, toolId, data: created.data }
          : { ok: false, toolId, error: created.error };
      }
      case "loop.test": {
        const { invokeLoopTestTool } = await import("@/lib/hub/dev/hub-loop-agent");
        const tested = await invokeLoopTestTool(args, ctx);
        return tested.ok
          ? { ok: true, toolId, data: tested.data }
          : { ok: false, toolId, error: tested.error };
      }
      case "loop.read": {
        const { invokeLoopReadTool } = await import("@/lib/hub/dev/hub-loop-agent");
        return { ok: true, toolId, data: invokeLoopReadTool(ctx).data };
      }
      case "loop.lint": {
        const { invokeLoopLintTool } = await import("@/lib/hub/dev/hub-loop-agent");
        return { ok: true, toolId, data: invokeLoopLintTool(ctx).data };
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
