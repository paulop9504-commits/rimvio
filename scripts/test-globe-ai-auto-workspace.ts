/**
 * Globe AI auto-opens Travel Workspace — no 「작업장 열기」 / 「활성 Workspace 없음」.
 */
import assert from "node:assert/strict";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { planContextRun } from "@/lib/context-run/plan-context-run";
import { bindSituation } from "@/lib/context-run/bind-situation";
import { classifyWorkspaceKind } from "@/lib/workspace-kind/classify-workspace-kind";
import { classifyWorkspaceRoute } from "@/lib/workspace-kind/classify-workspace-route";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { shouldAutoCommitContextCreate } from "@/lib/globe-ingress/should-auto-commit-context-create";
import { buildPendingContextCreateDraft } from "@/lib/globe-ingress/build-pending-context-create-draft";
import { compileGlobeIngress } from "@/lib/globe-ingress/compile-globe-ingress";
import { clearCalloutWindowsForTests } from "@/lib/callout/windows";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "@/lib/graph-command";

async function main(): Promise<void> {
  resetGraphCommandStoreForTests();
  clearSessionGraphs();
  clearCalloutWindowsForTests();

  assert.equal(classifyWorkspaceKind("오사카 호텔 찾아줘"), "travel");
  assert.equal(classifyWorkspaceKind("오사카 간다"), "travel");
  assert.equal(classifyWorkspaceKind("맛집 추천해줘"), "travel");
  assert.equal(isWorkspaceAgentWorkUtterance("오사카 호텔 찾아줘"), true);
  assert.equal(isWorkspaceAgentWorkUtterance("오사카 간다"), true);

  {
    const route = classifyWorkspaceRoute("삼성전자 주식 분석해줘");
    assert.equal(route.ship, "catalog");
    if (route.ship === "catalog") assert.equal(route.route, "finance");
  }
  {
    const route = classifyWorkspaceRoute("계약서 초안 만들어줘");
    assert.equal(route.ship, "catalog");
    if (route.ship === "catalog") assert.equal(route.route, "document");
  }
  {
    const route = classifyWorkspaceRoute("React 로그인 페이지 만들어줘");
    assert.equal(route.ship, "catalog");
    if (route.ship === "catalog") assert.equal(route.route, "coding");
  }

  {
    const bound = bindSituation({
      kind: "text",
      text: "오사카 호텔 찾아줘",
      surface: "composer",
      layerMode: "personal",
    });
    assert.equal(planContextRun(bound).kind, "workspace_intent_continuum");
  }

  {
    const draft = buildPendingContextCreateDraft({
      graphId: "g-dest-only",
      utterance: "오사카 간다",
      compiled: compileGlobeIngress({ text: "오사카 간다" }),
    });
    assert.equal(
      shouldAutoCommitContextCreate(draft),
      true,
      "hub destination alone auto-commits Continuum",
    );
  }

  {
    const turn = await applyGlobeWorkspaceAgentTurn({
      utterance: "오사카 호텔 찾아줘",
    });
    assert.equal(turn.handled, true, "cold lodging find is handled");
    assert.ok(turn.contextEventId, "Workspace minted");
    const ws = readContextWorkspace(turn.contextEventId!);
    assert.ok(ws, "provisional workspace exists");
    assert.ok(
      turn.openedWorkspace || ws!.status === "editing",
      "Workspace open or already editing",
    );
    assert.notEqual(
      turn.statusKo?.includes("활성 Workspace 없음"),
      true,
      `got: ${turn.statusKo}`,
    );
    assert.ok(
      ws!.constraintMemory?.destinationKo === "오사카" ||
        /오사카/u.test(ws!.summaryKo ?? "") ||
        /오사카/u.test(ws!.query ?? ""),
      "destination carried",
    );
  }

  {
    const first = await applyGlobeWorkspaceAgentTurn({
      utterance: "오사카 간다",
    });
    assert.ok(first.contextEventId);
    const second = await applyGlobeWorkspaceAgentTurn({
      utterance: "맛집",
      explicitContextEventId: first.contextEventId,
    });
    assert.equal(second.handled, true);
    assert.equal(second.contextEventId, first.contextEventId);
  }

  console.log("test-globe-ai-auto-workspace: ok");
}

void main();
