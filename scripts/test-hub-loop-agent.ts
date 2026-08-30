/**
 * Hub Loop Agent bridge — agent tools create/test loops in Dev Hub.
 * Run: npm run test:hub-loop-agent
 */
import assert from "node:assert/strict";
import { resetLoopDefinitionsForTests } from "@/lib/agent-os/loop-builder";
import {
  agentCreateLoop,
  wantsLoopBuilderUtterance,
  wantsLoopTestUtterance,
} from "@/lib/hub/dev/hub-loop-agent";
import { invokeHubWorkspaceTool } from "@/lib/hub/dev/hub-workspace-tools";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";

async function main() {
  resetLoopDefinitionsForTests();

  const utterance =
    "주문 처리 loop 만들어줘. 재고 확인하고 결제하고 실패하면 2번 재시도해.";
  assert.equal(wantsLoopBuilderUtterance(utterance), true);
  assert.equal(wantsLoopTestUtterance("loop 테스트 돌려"), true);

  const draft = createDefaultPlatformDraft();
  draft.id = "loop-agent-test";
  draft.name = "Loop Agent Test";
  const snapshot = buildProjectSnapshot({ draft });
  let stored = draft;

  const ctx = {
    getDraft: () => stored,
    updateDraft: (patch: Partial<typeof draft>) => {
      stored = { ...stored, ...patch };
    },
    snapshot,
    executor: { mode: "platform" as const },
    connections: {},
  };

  const created = agentCreateLoop({ utterance, platformId: draft.id });
  assert.ok(created.loop.nodes.length >= 5);
  assert.equal(created.lint.publishBlocked, false);

  const read = await invokeHubWorkspaceTool("loop.read", {}, ctx);
  assert.equal(read.ok, true);
  if (read.ok) {
    const data = read.data as { nodes?: unknown[] };
    assert.ok((data.nodes?.length ?? 0) >= 5);
  }

  const lint = await invokeHubWorkspaceTool("loop.lint", {}, ctx);
  assert.equal(lint.ok, true);

  const test = await invokeHubWorkspaceTool("loop.test", {}, ctx);
  assert.equal(test.ok, true);
  if (test.ok) {
    assert.equal((test.data as { passed?: boolean }).passed, true);
  }

  resetLoopDefinitionsForTests();
  console.log("ok — hub loop agent (create · read · lint · test)");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
