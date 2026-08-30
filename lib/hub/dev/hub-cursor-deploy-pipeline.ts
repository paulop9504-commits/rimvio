/**
 * Cursor-style deploy pipeline for Hub Operator — thought + terminal + target publish.
 */

import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import {
  defaultPublishOptionsForDraft,
  evaluatePublishGate,
  executeApprovedPublish,
} from "@/lib/hub/dev/hub-publish-flow";
import type { HubPublishOptions } from "@/lib/hub/dev/hub-publish-model";
import {
  deployTargetLabels,
  type HubDeployTarget,
} from "@/lib/hub/dev/hub-deploy-targets";
import { setPendingPublishApproval } from "@/lib/hub/dev/hub-publish-pending-store";
import { invokeHubWorkspaceTool, type HubWorkspaceToolContext } from "@/lib/hub/dev/hub-workspace-tools";
import type { HubAgentLoopEvent, HubAgentLoopResult } from "@/lib/hub/dev/hub-agent-loop";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function publishOptionsForTarget(
  draft: Parameters<typeof defaultPublishOptionsForDraft>[0],
  target: HubDeployTarget,
): HubPublishOptions {
  const base = defaultPublishOptionsForDraft(draft);
  if (target === "personal") {
    return { ...base, visibility: "private", allowAgentAccess: false };
  }
  return { ...base, visibility: "hub", allowAgentAccess: true };
}

export async function runCursorStyleDeployPipeline(input: {
  readonly utterance: string;
  readonly targets: readonly HubDeployTarget[];
  readonly toolCtx: HubWorkspaceToolContext;
  readonly platformId?: string;
  readonly onEvent: (event: HubAgentLoopEvent) => void;
}): Promise<HubAgentLoopResult> {
  const emit = input.onEvent;
  const targets = input.targets;
  const terminalTitle =
    targets.includes("main") && targets.includes("personal")
      ? "Deploy personal + main"
      : targets.includes("main")
        ? "Deploy main"
        : "Deploy personal";

  const lines: string[] = [];
  const pushLine = async (line: string, waitMs = 90) => {
    lines.push(line);
    emit({ type: "terminal", title: terminalTitle, lines: [...lines], waiting: null });
    await sleep(waitMs);
  };

  emit({
    type: "thought",
    title: "Thought",
    body: `대상 ${deployTargetLabels(targets)} — 검증 → 테스트 → 배포`,
  });
  emit({
    type: "plan",
    goal: input.utterance.trim(),
    steps: [
      { label: "Pipeline gate", status: "running" },
      { label: "Sandbox test", status: "pending" },
      { label: "Publish", status: "pending" },
    ],
  });
  emit({ type: "text", body: `${deployTargetLabels(targets)} 배포를 시작합니다.` });

  await pushLine("> npm run deploy");
  emit({ type: "terminal", title: terminalTitle, lines: [...lines], waiting: "Waiting for pipeline gate…" });
  await sleep(160);
  await pushLine("[0/4] Pipeline gate…");

  const prepare = await invokeHubWorkspaceTool("deploy.prepare", {}, input.toolCtx);
  if (!prepare.ok) {
    await pushLine(`[error] ${prepare.error}`);
    const draft = input.toolCtx.getDraft();
    emit({ type: "verify", ok: false, detail: prepare.error });
    emit({ type: "complete", summary: "배포 준비가 실패했습니다." });
    return {
      ok: false,
      snapshot: buildProjectSnapshot({ draft, testsPassed: false }),
      draft,
    };
  }

  const prepareData = prepare.data as { valid?: boolean; error?: string };
  if (prepareData.valid === false) {
    await pushLine(`[error] ${prepareData.error ?? "manifest invalid"}`);
    const draft = input.toolCtx.getDraft();
    emit({ type: "verify", ok: false, detail: prepareData.error ?? "Manifest 검증 실패" });
    emit({ type: "complete", summary: "Manifest 검증에 실패했습니다." });
    return {
      ok: false,
      snapshot: buildProjectSnapshot({ draft, testsPassed: false }),
      draft,
    };
  }
  await pushLine("[1/4] Manifest 검증 OK");

  emit({
    type: "plan",
    goal: input.utterance.trim(),
    steps: [
      { label: "Pipeline gate", status: "done" },
      { label: "Sandbox test", status: "running" },
      { label: "Publish", status: "pending" },
    ],
  });
  emit({ type: "terminal", title: terminalTitle, lines: [...lines], waiting: "Waiting for sandbox tests…" });
  await sleep(120);
  await pushLine("[2/4] Sandbox test…");

  const test = await invokeHubWorkspaceTool("test.run", {}, input.toolCtx);
  const testData = (test.ok ? test.data : null) as { passed?: number; total?: number; ok?: boolean } | null;
  const testsPassed = Boolean(test.ok && testData?.ok);
  emit({
    type: "test_result",
    passed: testData?.passed ?? 0,
    total: testData?.total ?? 0,
    running: false,
  });

  if (!testsPassed) {
    await pushLine(`[error] tests ${testData?.passed ?? 0}/${testData?.total ?? 0} failed`);
    const draft = input.toolCtx.getDraft();
    emit({ type: "verify", ok: false, detail: "Sandbox 테스트 실패" });
    emit({ type: "complete", summary: "테스트 실패 — 배포를 중단했습니다." });
    return {
      ok: false,
      snapshot: buildProjectSnapshot({ draft, testsPassed: false }),
      draft,
    };
  }
  await pushLine(`[2/4] Tests ${testData?.passed}/${testData?.total} passed`);

  const draft = input.toolCtx.getDraft();
  let personalOk = true;

  if (targets.includes("personal")) {
    emit({ type: "terminal", title: terminalTitle, lines: [...lines], waiting: "Publishing personal preview…" });
    await sleep(100);
    await pushLine("[3/4] Personal preview…");
    const personalOptions = publishOptionsForTarget(draft, "personal");
    const personal = executeApprovedPublish({
      draft,
      testsPassed: true,
      options: personalOptions,
    });
    if (!personal.published) {
      personalOk = false;
      await pushLine(`[error] personal: ${personal.errorKo ?? "publish failed"}`);
    } else {
      await pushLine(`[3/4] Personal ready · ${personal.platformId} (private)`);
    }
  }

  if (targets.includes("main")) {
    emit({
      type: "plan",
      goal: input.utterance.trim(),
      steps: [
        { label: "Pipeline gate", status: "done" },
        { label: "Sandbox test", status: "done" },
        { label: "Publish", status: "running" },
      ],
    });
    await pushLine("[4/4] Main 배포는 승인이 필요해요");
    const mainOptions = publishOptionsForTarget(draft, "main");
    const gate = evaluatePublishGate({
      draft,
      testsPassed: true,
      options: mainOptions,
    });
    if (!gate.ok) {
      await pushLine(`[error] main gate: ${gate.errorKo ?? "blocked"}`);
      emit({ type: "verify", ok: false, detail: gate.errorKo ?? "Main publish gate blocked" });
      emit({ type: "complete", summary: "Main 배포가 게이트에서 막혔습니다." });
      return {
        ok: false,
        snapshot: buildProjectSnapshot({ draft, testsPassed: true }),
        draft,
      };
    }

    setPendingPublishApproval({
      platformId: input.platformId ?? draft.id,
      utterance: input.utterance,
      gate,
    });
    emit({
      type: "ask_user",
      message: "Main은 우리쪽 Hub에 공개됩니다. Publish를 승인할까요?",
      actionId: "approve_publish",
      actionLabel: "Main 승인",
      publishGate: gate,
    });
    return {
      ok: personalOk,
      pausedForUser: true,
      actionId: "approve_publish",
      snapshot: buildProjectSnapshot({ draft, testsPassed: true }),
      draft,
    };
  }

  emit({
    type: "plan",
    goal: input.utterance.trim(),
    steps: [
      { label: "Pipeline gate", status: "done" },
      { label: "Sandbox test", status: "done" },
      { label: "Publish", status: "done" },
    ],
  });
  emit({ type: "terminal", title: terminalTitle, lines: [...lines], waiting: null });
  emit({
    type: "complete",
    summary: personalOk
      ? `본인 Preview 배포 완료 · ${draft.name}`
      : "본인 배포에 실패했습니다.",
  });
  return {
    ok: personalOk,
    snapshot: buildProjectSnapshot({ draft, testsPassed: true }),
    draft,
  };
}
