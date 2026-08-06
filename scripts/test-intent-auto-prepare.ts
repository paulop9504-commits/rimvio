/**
 * One utterance → prepare all extractable travel domains (Cursor-style).
 */
import assert from "node:assert/strict";
import { compileWorkspaceAgentPlan } from "@/lib/context-run/compile-workspace-agent-plan";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { clearCalloutWindowsForTests } from "@/lib/callout/windows";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "@/lib/graph-command";

async function main(): Promise<void> {
  resetGraphCommandStoreForTests();
  clearSessionGraphs();
  clearCalloutWindowsForTests();

  {
    const plan = compileWorkspaceAgentPlan({
      utterance: "오사카 호텔이랑 맛집 찾아줘",
    });
    assert.equal(plan.planKind, "scout_domains");
    assert.ok(plan.steps.length >= 2, "hotel + eatery steps");
    assert.ok(plan.steps.some((s) => /호텔|숙소/u.test(s.labelKo)));
    assert.ok(plan.steps.some((s) => /맛집/u.test(s.labelKo)));
  }

  {
    const plan = compileWorkspaceAgentPlan({
      utterance: "난바역 근처 호텔 가성비 3개랑 맛집",
    });
    assert.equal(plan.planKind, "scout_domains");
    assert.ok(
      plan.steps.some((s) => /가성비|TOP|선별/u.test(s.labelKo)),
      "refine step when 가성비 N개",
    );
  }

  {
    const turn = await applyGlobeWorkspaceAgentTurn({
      utterance: "오사카 호텔이랑 맛집 추천해줘",
    });
    assert.equal(turn.handled, true);
    assert.ok(turn.contextEventId);
    const ws = readContextWorkspace(turn.contextEventId!);
    assert.ok(ws);
    assert.ok(
      turn.openedWorkspace || ws!.status === "editing",
      "Workspace open or already editing",
    );
    assert.ok(
      lodgingVisibleOrAny(ws!),
      "inventory prepared",
    );
    assert.ok(
      ws!.constraintMemory?.destinationKo === "오사카" ||
        /오사카/u.test(ws!.query ?? "") ||
        /오사카/u.test(ws!.summaryKo ?? ""),
      "destination stamped",
    );
  }

  function lodgingVisibleOrAny(ws: NonNullable<ReturnType<typeof readContextWorkspace>>): boolean {
    const lodging = ws.nodes.filter((n) => n.kind === "lodging" && n.visible);
    const eatery = ws.nodes.filter((n) => n.kind === "eatery" && n.visible);
    return lodging.length > 0 || eatery.length > 0 || ws.nodes.length > 0;
  }

  {
    const finance = await applyGlobeWorkspaceAgentTurn({
      utterance: "삼성전자 주식 분석해줘",
    });
    assert.equal(finance.handled, true);
    assert.equal(finance.openedWorkspace, true);
    assert.ok(finance.contextEventId);
    assert.match(finance.patchKind ?? "", /catalog:finance/);
  }

  console.log("test-intent-auto-prepare: ok");
}

void main();
