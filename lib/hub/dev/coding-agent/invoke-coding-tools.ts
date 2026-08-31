/**
 * Coding / verify / server tool dispatch — repo disk when cloned, else sandbox overlay.
 */

import type { HubWorkspaceToolContext, HubWorkspaceToolResult, HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";
import { CODING_TOOL_IDS, isCodingToolId, type CodingToolId } from "@/lib/hub/dev/coding-agent/coding-tool-ids";
import {
  analyzeRepoCallGraph,
  analyzeRepoImports,
  cloneGitHubRepo,
  deleteRepoFile,
  findRepoDefinition,
  listRepoFiles,
  parseGitHubRepoFromUtterance,
  readRepoFile,
  searchRepoContent,
  searchRepoSymbols,
  transformRepoFile,
  wantsRepoClone,
  writeRepoFile,
} from "@/lib/hub/dev/coding-agent/repo-workspace";
import {
  discoverRepoTests,
  generateRepoTestFile,
  runRepoBuild,
  runRepoE2E,
  runRepoIntegrationTests,
  runRepoLint,
  runRepoTypecheck,
  runRepoUnitTests,
} from "@/lib/hub/dev/coding-agent/repo-verify";
import { readDevServerState, startDevServer, stopDevServer } from "@/lib/hub/dev/coding-agent/dev-server";
import { getRepoSession, setRepoSession } from "@/lib/hub/dev/coding-agent/repo-session";
import {
  deleteSandboxOverlay,
  listSandboxFiles,
  readSandboxFile,
  searchSandboxFiles,
  searchSandboxSymbols,
  transformSandboxOverlay,
  writeSandboxOverlay,
} from "@/lib/hub/dev/coding-agent/coding-sandbox";

export { CODING_TOOL_IDS, isCodingToolId, type CodingToolId };

function repoRootOf(ctx: HubWorkspaceToolContext, platformId?: string): string | null {
  if (ctx.repoRoot) return ctx.repoRoot;
  const id = platformId ?? ctx.getDraft().id;
  const live = getRepoSession(id)?.root ?? null;
  if (live) return live;
  if (typeof window !== "undefined") return null;
  try {
    const { existsSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const { hubRepoRoot } = require("@/lib/hub/dev/coding-agent/repo-workspace") as typeof import("@/lib/hub/dev/coding-agent/repo-workspace");
    const root = hubRepoRoot(id);
    if (existsSync(join(root, ".git"))) {
      setRepoSession({
        platformId: id,
        root,
        remoteUrl: null,
        clonedAt: new Date().toISOString(),
      });
      return root;
    }
  } catch {
    return null;
  }
  return null;
}

async function callRepoApi(
  toolId: HubWorkspaceToolId,
  args: Record<string, unknown>,
  ctx: HubWorkspaceToolContext,
): Promise<HubWorkspaceToolResult | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/hub/dev/repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolId,
        args,
        platformId: ctx.getDraft().id,
        utterance: typeof args.utterance === "string" ? args.utterance : undefined,
      }),
    });
    const json = (await res.json()) as HubWorkspaceToolResult;
    if (!res.ok && !("ok" in json)) {
      return { ok: false, toolId, error: "repo api failed" };
    }
    return json;
  } catch (err) {
    return {
      ok: false,
      toolId,
      error: err instanceof Error ? err.message : "repo api failed",
    };
  }
}

export async function invokeCodingTool(
  toolId: HubWorkspaceToolId,
  args: Record<string, unknown>,
  ctx: HubWorkspaceToolContext,
): Promise<HubWorkspaceToolResult> {
  if (typeof window !== "undefined") {
    const remote = await callRepoApi(toolId, args, ctx);
    if (remote?.ok) return remote;
    const serverOnly =
      toolId === "repo.clone" ||
      toolId === "lint.run" ||
      toolId === "typecheck.run" ||
      toolId === "test.e2e" ||
      toolId.startsWith("server.");
    if (serverOnly && remote) return remote;
  }

  const platformId = ctx.getDraft().id;
  const root = repoRootOf(ctx, platformId);

  if (toolId === "repo.clone") {
    const utterance = String(args.utterance ?? args.url ?? "");
    const parsed = parseGitHubRepoFromUtterance(utterance);
    if (!parsed && !wantsRepoClone(utterance) && !args.url) {
      return { ok: false, toolId, error: "GitHub 레포 URL이 필요합니다. 예: owner/repo" };
    }
    const httpsUrl = parsed?.httpsUrl ?? String(args.url ?? "");
    if (!httpsUrl) {
      return { ok: false, toolId, error: "clone url missing" };
    }
    const cloned = await cloneGitHubRepo({
      platformId,
      httpsUrl,
      accessToken: typeof args.accessToken === "string" ? args.accessToken : null,
      destRoot: ctx.repoRoot,
    });
    if (!cloned.ok || !cloned.root) {
      return { ok: false, toolId, error: cloned.error ?? "clone failed" };
    }
    setRepoSession({
      platformId,
      root: cloned.root,
      remoteUrl: cloned.remoteUrl,
      clonedAt: new Date().toISOString(),
    });
    return {
      ok: true,
      toolId,
      data: {
        remoteUrl: cloned.remoteUrl,
        alreadyCloned: cloned.alreadyCloned ?? false,
        fileCount: listRepoFiles(cloned.root).length,
      },
    };
  }

  if (toolId === "repo.status") {
    const session = getRepoSession(platformId);
    return {
      ok: true,
      toolId,
      data: session
        ? { ready: true, remoteUrl: session.remoteUrl, fileCount: listRepoFiles(session.root).length }
        : { ready: false },
    };
  }

  if (root) {
    return invokeOnRepo(toolId, args, ctx, root, platformId);
  }

  return invokeOnSandbox(toolId, args, ctx);
}

async function invokeOnRepo(
  toolId: HubWorkspaceToolId,
  args: Record<string, unknown>,
  ctx: HubWorkspaceToolContext,
  root: string,
  platformId: string,
): Promise<HubWorkspaceToolResult> {
  switch (toolId) {
    case "code.listFiles":
    case "code.searchFiles": {
      const query = String(args.query ?? "");
      const files = listRepoFiles(root, query || undefined);
      return { ok: true, toolId, data: { files, query } };
    }
    case "code.readFile": {
      const file = readRepoFile(root, String(args.path ?? ""));
      if (!file) return { ok: false, toolId, error: "file not found" };
      return { ok: true, toolId, data: file };
    }
    case "code.createFile": {
      const written = writeRepoFile({
        root,
        path: String(args.path ?? ""),
        content: String(args.content ?? ""),
      });
      if ("error" in written) return { ok: false, toolId, error: written.error };
      return { ok: true, toolId, data: written };
    }
    case "code.modifyFile": {
      const path = String(args.path ?? "");
      const existing = path ? readRepoFile(root, path) : null;
      const content =
        typeof args.content === "string"
          ? args.content
          : `${existing?.content ?? `// ${path}\n`}\n// Agent patch: ${String(args.symbol ?? args.capability ?? "edit")}\n`;
      const written = writeRepoFile({
        root,
        path: path || "src/agent-patch.ts",
        content,
      });
      if ("error" in written) return { ok: false, toolId, error: written.error };
      return { ok: true, toolId, data: written };
    }
    case "code.deleteFile": {
      const deleted = deleteRepoFile(root, String(args.path ?? ""));
      if ("error" in deleted) return { ok: false, toolId, error: deleted.error };
      return { ok: true, toolId, data: deleted };
    }
    case "code.transform": {
      const result = transformRepoFile({
        root,
        path: String(args.path ?? ""),
        find: String(args.find ?? ""),
        replace: String(args.replace ?? ""),
      });
      if ("error" in result) return { ok: false, toolId, error: result.error };
      return { ok: true, toolId, data: result };
    }
    case "code.searchSymbol":
    case "code.findReferences": {
      const symbol = String(args.symbol ?? args.query ?? "");
      const hits = searchRepoContent({ root, query: symbol });
      return { ok: true, toolId, data: { symbol, hits } };
    }
    case "code.findDefinition": {
      const symbol = String(args.symbol ?? args.query ?? "");
      const hit = findRepoDefinition({ root, symbol });
      return hit
        ? { ok: true, toolId, data: hit }
        : { ok: false, toolId, error: `definition not found: ${symbol}` };
    }
    case "code.analyzeImports": {
      const path = String(args.path ?? "");
      return { ok: true, toolId, data: { path, imports: analyzeRepoImports({ root, path }) } };
    }
    case "code.callGraph": {
      const symbol = String(args.symbol ?? "");
      return { ok: true, toolId, data: { symbol, hits: analyzeRepoCallGraph({ root, symbol }) } };
    }
    case "test.discover": {
      return { ok: true, toolId, data: discoverRepoTests({ root, query: String(args.query ?? "") }) };
    }
    case "test.generate": {
      const generated = generateRepoTestFile({
        root,
        targetPath: args.path ? String(args.path) : undefined,
        symbol: args.symbol ? String(args.symbol) : undefined,
        capability: args.capability ? String(args.capability) : undefined,
      });
      if ("error" in generated) return { ok: false, toolId, error: generated.error };
      return { ok: true, toolId, data: generated };
    }
    case "test.run": {
      const kind = String(args.kind ?? "unit");
      const result =
        kind === "integration" ? await runRepoIntegrationTests(root) : await runRepoUnitTests(root);
      return result.ok || result.skipped
        ? { ok: true, toolId, data: result }
        : { ok: false, toolId, error: result.stderr || result.stdout || "test failed" };
    }
    case "test.e2e": {
      const result = await runRepoE2E(root);
      return result.ok || result.skipped
        ? { ok: true, toolId, data: result }
        : { ok: false, toolId, error: result.stderr || result.stdout || "e2e failed" };
    }
    case "lint.run": {
      const result = await runRepoLint(root);
      return result.ok
        ? { ok: true, toolId, data: result }
        : { ok: false, toolId, error: result.stderr || result.stdout || "lint failed" };
    }
    case "typecheck.run": {
      const result = await runRepoTypecheck(root);
      return result.ok
        ? { ok: true, toolId, data: result }
        : { ok: false, toolId, error: result.stderr || result.stdout || "typecheck failed" };
    }
    case "build.run": {
      const result = await runRepoBuild(root);
      return result.ok || result.skipped
        ? { ok: true, toolId, data: result }
        : { ok: false, toolId, error: result.stderr || result.stdout || "build failed" };
    }
    case "server.start": {
      const state = await startDevServer({ platformId, root });
      return state.status !== "unavailable"
        ? { ok: true, toolId, data: state }
        : { ok: false, toolId, error: "dev server unavailable on this host" };
    }
    case "server.stop": {
      return { ok: true, toolId, data: stopDevServer(platformId) };
    }
    case "server.status": {
      return { ok: true, toolId, data: readDevServerState(platformId) ?? { status: "stopped" } };
    }
    default:
      return { ok: false, toolId, error: `unhandled coding tool: ${toolId}` };
  }
}

function invokeOnSandbox(
  toolId: HubWorkspaceToolId,
  args: Record<string, unknown>,
  ctx: HubWorkspaceToolContext,
): HubWorkspaceToolResult {
  const draft = ctx.getDraft();
  switch (toolId) {
    case "code.createFile": {
      const written = writeSandboxOverlay({
        draftId: draft.id,
        path: String(args.path ?? ""),
        content: String(args.content ?? `// ${args.path}\nexport {};\n`),
      });
      if (!written) return { ok: false, toolId, error: "path not allowed" };
      return { ok: true, toolId, data: written };
    }
    case "code.deleteFile": {
      const deleted = deleteSandboxOverlay({ draftId: draft.id, path: String(args.path ?? "") });
      if (!deleted) return { ok: false, toolId, error: "path not allowed" };
      return { ok: true, toolId, data: deleted };
    }
    case "code.transform": {
      const result = transformSandboxOverlay({
        draftId: draft.id,
        draft,
        path: String(args.path ?? ""),
        find: String(args.find ?? ""),
        replace: String(args.replace ?? ""),
      });
      if (!result) return { ok: false, toolId, error: "transform failed" };
      return { ok: true, toolId, data: result };
    }
    case "code.findDefinition":
    case "code.searchSymbol":
    case "code.findReferences":
    case "code.callGraph": {
      const symbol = String(args.symbol ?? args.query ?? "");
      const hits = searchSandboxSymbols({ draft, symbol });
      return hits.length
        ? { ok: true, toolId, data: { symbol, hits } }
        : { ok: false, toolId, error: `not found: ${symbol}` };
    }
    case "code.analyzeImports": {
      const file = readSandboxFile({ draft, path: String(args.path ?? "") });
      if (!file) return { ok: false, toolId, error: "file not found" };
      const imports = [...file.content.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]!);
      return { ok: true, toolId, data: { path: file.path, imports } };
    }
    case "test.discover": {
      const files = listSandboxFiles(draft)
        .map((f) => f.path)
        .filter((p) => /test|spec/i.test(p));
      return { ok: true, toolId, data: { files, related: files } };
    }
    case "test.generate": {
      const path = `scripts/test-${String(args.capability ?? args.symbol ?? "generated").replace(/\./g, "-")}.ts`;
      const content = `import assert from "node:assert/strict";\nassert.ok(true);\n`;
      const written = writeSandboxOverlay({ draftId: draft.id, path, content });
      if (!written) return { ok: false, toolId, error: "cannot write test" };
      return { ok: true, toolId, data: { ...written, content } };
    }
    case "test.e2e":
    case "lint.run":
    case "typecheck.run":
    case "server.start":
    case "server.stop":
    case "server.status":
    case "repo.status":
      return {
        ok: true,
        toolId,
        data: { sandbox: true, detail: "clone a repo to run this on disk" },
      };
    default: {
      const files = searchSandboxFiles({ draft, query: String(args.query ?? args.path ?? "") });
      return { ok: true, toolId, data: { hits: files.map((f) => f.path) } };
    }
  }
}
