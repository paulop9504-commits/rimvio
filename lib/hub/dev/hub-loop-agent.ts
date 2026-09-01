/**
 * Hub Agent ↔ Loop Builder bridge — NL → Loop Definition → lint → test.
 * Runs through Tool Gateway; never exposes Agent Runtime code to creators.
 */

import { generateLoopFromUtterance } from "@/lib/agent-os/loop-builder/generate";
import { lintLoopDefinition } from "@/lib/agent-os/loop-builder/lint";
import { packageLoopAsCapability } from "@/lib/agent-os/loop-builder/package";
import { testLoopDefinition } from "@/lib/agent-os/loop-builder/run-loop";
import { readLoopDefinition, writeLoopDefinition } from "@/lib/agent-os/loop-builder/store";
import type { LoopDefinition, LoopLintResult, LoopTestResult } from "@/lib/agent-os/loop-builder/types";
import { publishLoopPackageToRegistry } from "@/lib/agent-platform/pipeline/publish-loop";
import {
  dispatchHubWorkspaceCommand,
  type HubWorkspaceCommand,
} from "@/lib/hub/dev/hub-workspace-commands";
import type { HubWorkspaceToolContext } from "@/lib/hub/dev/hub-workspace-tools";

export function wantsLoopBuilderUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  const loopWord = /loop|루프|agent\s*loop|실행\s*루프|오케스트|orchestr/i.test(text);
  const domainFlow =
    /주문|결제|재고|inventory|payment|retry|재시|승인|approve/i.test(text) &&
    /만들|생성|create|build|설계|실험|compose|그려|작성|loop|루프/i.test(text);
  const openLoop = /loop\s*builder|루프\s*빌더|loop\s*만들/i.test(text);
  return openLoop || (loopWord && /만들|생성|create|build|설계|실험|test|테스트|돌려|run|추가/i.test(text)) || domainFlow;
}

export function wantsLoopTestUtterance(utterance: string): boolean {
  const text = utterance.trim();
  return /loop|루프/i.test(text) && /test|테스트|실험|돌려|run|검증/i.test(text);
}

function platformIdFromCtx(ctx: HubWorkspaceToolContext): string {
  return ctx.getDraft().id ?? "loop";
}

function notifyLoopUpdated(platformId: string, loop: LoopDefinition, command?: HubWorkspaceCommand): void {
  writeLoopDefinition(platformId, loop);
  dispatchHubWorkspaceCommand({ kind: "loop_updated", platformId, loop });
  if (command) dispatchHubWorkspaceCommand(command);
}

export function agentCreateLoop(input: {
  readonly utterance: string;
  readonly platformId: string;
  readonly name?: string;
}): { readonly loop: LoopDefinition; readonly lint: LoopLintResult; readonly pkg: ReturnType<typeof packageLoopAsCapability> } {
  const generated = generateLoopFromUtterance(input.utterance);
  const loop: LoopDefinition = {
    ...generated,
    name: input.name?.trim() || generated.name,
    source: "ai",
  };
  const lint = lintLoopDefinition(loop);
  const pkg = packageLoopAsCapability({ name: loop.name, loop, tested: false });
  notifyLoopUpdated(input.platformId, loop, { kind: "open_pane", pane: "loops" });
  return { loop, lint, pkg };
}

export async function agentTestLoop(input: {
  readonly platformId: string;
  readonly toolCtx?: HubWorkspaceToolContext | null;
  readonly failNodeId?: string | null;
}): Promise<{ readonly loop: LoopDefinition | null; readonly test: LoopTestResult; readonly lint: LoopLintResult | null }> {
  const loop = readLoopDefinition(input.platformId);
  if (!loop) {
    const empty: LoopTestResult = {
      runId: `run-empty-${Date.now()}`,
      passed: false,
      steps: [],
      traces: [],
      reasonKo: "저장된 Loop가 없습니다. 먼저 Loop를 만들어 주세요.",
    };
    return { loop: null, test: empty, lint: null };
  }
  const lint = lintLoopDefinition(loop);
  const test = await testLoopDefinition({
    loop,
    toolCtx: input.toolCtx ?? null,
    failNodeId: input.failNodeId ?? null,
  });
  dispatchHubWorkspaceCommand({ kind: "loop_test_result", platformId: input.platformId, test });
  dispatchHubWorkspaceCommand({ kind: "open_pane", pane: "loops" });

  if (test.passed && lint.ok && !lint.publishBlocked) {
    const pkg = packageLoopAsCapability({ name: loop.name, loop, tested: true });
    const published = publishLoopPackageToRegistry({
      platformId: input.platformId,
      platformName: input.platformId,
      pkg,
      loop,
    });
    if (typeof window !== "undefined" && published.ok) {
      void fetch("/api/agent-platform/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capabilityId: published.capabilityId,
          platformId: input.platformId,
          publishOnly: true,
        }),
      });
    }
  }

  return { loop, test, lint };
}

export function invokeLoopCreateTool(
  args: Record<string, unknown>,
  ctx: HubWorkspaceToolContext,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const utterance = String(args.utterance ?? args.prompt ?? args.description ?? "");
  if (!utterance.trim()) {
    return { ok: false, error: "utterance required for loop.create" };
  }
  const platformId = platformIdFromCtx(ctx);
  const result = agentCreateLoop({
    utterance,
    platformId,
    name: typeof args.name === "string" ? args.name : undefined,
  });
  return {
    ok: true,
    data: {
      loopId: result.loop.id,
      name: result.loop.name,
      nodeCount: result.loop.nodes.length,
      lintOk: result.lint.ok,
      publishBlocked: result.lint.publishBlocked,
      issues: result.lint.issues,
      checks: result.lint.checks,
      capabilities: result.pkg.capabilities,
    },
  };
}

export async function invokeLoopTestTool(
  args: Record<string, unknown>,
  ctx: HubWorkspaceToolContext,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const platformId = platformIdFromCtx(ctx);
  const live = args.live === true;
  const result = await agentTestLoop({
    platformId,
    toolCtx: live ? ctx : null,
    failNodeId: typeof args.failNodeId === "string" ? args.failNodeId : null,
  });
  if (!result.loop) {
    return { ok: false, error: result.test.reasonKo ?? "no loop" };
  }
  return {
    ok: true,
    data: {
      runId: result.test.runId,
      passed: result.test.passed,
      reasonKo: result.test.reasonKo,
      stepCount: result.test.steps.length,
      traces: result.test.traces.slice(-12),
      lintOk: result.lint?.ok ?? false,
      mode: live ? "live" : "dry-run",
    },
  };
}

export function invokeLoopReadTool(ctx: HubWorkspaceToolContext): { ok: true; data: Record<string, unknown> } {
  const platformId = platformIdFromCtx(ctx);
  const loop = readLoopDefinition(platformId);
  if (!loop) {
    return { ok: true, data: { loop: null, platformId } };
  }
  const lint = lintLoopDefinition(loop);
  return {
    ok: true,
    data: {
      platformId,
      loop: { id: loop.id, name: loop.name, version: loop.version, nodeCount: loop.nodes.length, entryId: loop.entryId },
      nodes: loop.nodes.map((n) => ({ id: n.id, kind: n.kind, label: n.label })),
      lintOk: lint.ok,
      issues: lint.issues,
    },
  };
}

export function invokeLoopLintTool(ctx: HubWorkspaceToolContext): { ok: true; data: Record<string, unknown> } {
  const platformId = platformIdFromCtx(ctx);
  const loop = readLoopDefinition(platformId);
  if (!loop) {
    return { ok: true, data: { lintOk: false, publishBlocked: true, issues: [{ code: "empty", messageKo: "Loop가 없습니다." }] } };
  }
  const lint = lintLoopDefinition(loop);
  return { ok: true, data: { lintOk: lint.ok, publishBlocked: lint.publishBlocked, issues: lint.issues, checks: lint.checks } };
}
