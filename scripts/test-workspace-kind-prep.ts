#!/usr/bin/env npx tsx
/**
 * Workspace Kind Prep + One Focus (travel / driver).
 */

import assert from "node:assert/strict";
import {
  advanceWorkspaceFocus,
  buildWorkspaceFocusSurface,
  buildWorkspacePrepCard,
  classifyWorkspaceKind,
  listWorkspaceKindTemplates,
  prepareWorkspaceResources,
  workspaceKindTemplate,
} from "../lib/workspace-kind";

assert.equal(listWorkspaceKindTemplates().length, 3);

assert.equal(classifyWorkspaceKind("오늘 대리 뛰러 갈게"), "driver");
assert.equal(classifyWorkspaceKind("대리 시작할게"), "driver");
assert.equal(
  classifyWorkspaceKind("오사카 4박 5일 여행 갈 거야"),
  "travel",
);
assert.equal(classifyWorkspaceKind("제주도 여행 준비해줘"), "travel");
assert.equal(classifyWorkspaceKind("아이폰 15 프로 중고로 팔아줘"), "used_goods");
assert.equal(classifyWorkspaceKind("맥북 살만한 거 찾아줘"), "used_goods");
assert.equal(classifyWorkspaceKind("주변 맛집 찾아줘"), null);
assert.equal(classifyWorkspaceKind("길 찾아줘"), null);

{
  const card = buildWorkspacePrepCard({
    utterance: "오늘 대리 뛰러 갈게",
    contextEventId: "evt-driver",
  });
  assert.ok(card);
  assert.equal(card!.kind, "driver");
  assert.equal(card!.ctaKo, "작업장 열기");
  assert.equal(card!.openHint, "driver_workspace_shell");
  assert.equal(card!.focusSlotId, "here");
  assert.match(card!.focusHintKo, /현재 위치/);
  assert.equal(card!.eyebrowKo, "자원 준비됨");
}

{
  const card = buildWorkspacePrepCard({
    utterance: "오사카 4박 5일 여행 갈 거야",
    titleOverrideKo: "Osaka Trip",
  });
  assert.ok(card);
  assert.equal(card!.kind, "travel");
  assert.equal(card!.titleKo, "Osaka Trip");
  assert.equal(card!.focusSlotId, "flight");
  assert.match(card!.focusHintKo, /항공/);
  const travel = workspaceKindTemplate("travel");
  assert.deepEqual([...travel.focusSequence], ["flight", "hotel", "itinerary"]);
}

{
  const focus = buildWorkspaceFocusSurface({ kind: "travel" });
  assert.equal(focus.focusSlotId, "flight");
  assert.equal(focus.focusIndex, 0);
  assert.match(focus.headlineKo, /항공/);
  assert.match(focus.askKo, /항공/);
  assert.ok(focus.ghostRows.every((row) => row.slotId !== "flight"));
  assert.ok(focus.ghostRows.some((row) => row.slotId === "hotel" && row.status === "waiting"));
  // Non-sequence slots must NOT dump as Primary — sparse ghost only via background.
  assert.ok(!focus.ghostRows.some((row) => row.slotId === "eatery"));
}

{
  const afterFlight = advanceWorkspaceFocus({
    kind: "travel",
    completedSlotIds: ["flight"],
  });
  assert.ok(afterFlight);
  assert.equal(afterFlight!.focusSlotId, "hotel");
  assert.ok(
    afterFlight!.ghostRows.some(
      (row) => row.slotId === "flight" && row.status === "done",
    ),
  );

  const withBudget = buildWorkspaceFocusSurface({
    kind: "travel",
    focusSlotId: "hotel",
    completedSlotIds: ["flight"],
    backgroundSlotIds: ["budget"],
  });
  assert.ok(
    withBudget.ghostRows.some(
      (row) => row.slotId === "budget" && row.status === "background",
    ),
  );
}

{
  const card = buildWorkspacePrepCard({
    utterance: "맛집 추천해줘",
  });
  assert.equal(card, null);
}

{
  const prepared = prepareWorkspaceResources({
    utterance: "오사카 4박 5일 여행 갈 거야",
    contextEventId: "evt-osaka-prep",
    titleOverrideKo: "Osaka Trip",
  });
  assert.ok(prepared);
  assert.equal(prepared!.card.kind, "travel");
  assert.equal(prepared!.card.focusSlotId, "flight");
  assert.ok(prepared!.workspace);
}

console.log("ok — workspace-kind-prep");
