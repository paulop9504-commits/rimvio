#!/usr/bin/env npx tsx
/**
 * Agent Activity Trail + soft 「펼치기」 (no hard Workspace open).
 * Run: npx tsx scripts/test-agent-activity-trail.ts
 */
import assert from "node:assert/strict";

import {
  applyGlobeWorkspaceAgentTurn,
  expandWorkspaceFromTrail,
} from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { isAgentExecuteVerbUtterance } from "@/lib/context-run/is-agent-execute-verb";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import {
  clearAgentActivityTranscriptForTests,
  readAgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import { clearLastAgentProductTurnForTests } from "@/lib/context-run/agent-product-pipeline";
import { resolveActiveComposerGraphId } from "@/lib/context-run/resolve-active-composer-graph-id";
import { WORKSPACE_EXPAND_SLOT_ID } from "@/lib/context-run/sync-agent-activity-trail";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { publishGlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import { clearCalloutWindowsForTests } from "@/lib/callout/windows";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "@/lib/graph-command";
import {
  readGlobeChatSession,
  resetGlobeChatSessionStoreForTests,
} from "@/lib/globe/chat/globe-chat-session-store";

const CTX = "ctx_activity_trail_osaka";

function lodgingNode(id: string, title: string): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.665,
    lng: 135.501,
    rating: 4.2,
    priceBand: 2,
    amountLabel: "₩70,000",
    thumbnailUrl: null,
    tags: ["stay:hotel"],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "seed",
  };
}

function reset(): void {
  clearCalloutWindowsForTests();
  clearSessionGraphs();
  resetGraphCommandStoreForTests();
  resetGlobeChatSessionStoreForTests();
  clearAgentActivityTranscriptForTests();
  clearLastAgentProductTurnForTests();
  clearContextWorkspace(CTX);
  openMapContextWorkspace({
    contextEventId: CTX,
    domain: "lodging",
    query: "오사카 숙소",
    summaryKo: "Osaka Trip",
    candidates: [],
  });
  const opened = readContextWorkspace(CTX);
  assert.ok(opened);
  writeContextWorkspace({
    ...opened!,
    summaryKo: "Osaka Trip",
    nodes: [lodgingNode("h1", "난바 호텔")],
    selectedIds: ["h1"],
    updatedAtIso: new Date().toISOString(),
  });
  writeContextWorkspaceExpanded(CTX, false);
  publishGlobeProjectionLayerPolicy({
    mode: "focus",
    activeContextEventId: CTX,
    visiblePlaceIds: [],
  });
}

assert.equal(isAgentExecuteVerbUtterance("일정 짜줘"), true);
assert.equal(isAgentExecuteVerbUtterance("여행 계획 세워줘"), true);
assert.equal(isWorkspaceAgentWorkUtterance("일정 짜줘"), true);

void (async () => {
  reset();

  assert.equal(
    isAgentExecuteVerbUtterance("세워줘"),
    true,
    "bare execute verb with active Workspace",
  );
  assert.equal(isWorkspaceAgentWorkUtterance("세워줘"), true);

  const turn = await applyGlobeWorkspaceAgentTurn({
    utterance: "너가 세워줘",
    explicitContextEventId: CTX,
  });
  assert.equal(turn.handled, true, "execute verb handled");
  assert.equal(turn.contextEventId, CTX);
  assert.equal(
    turn.openedWorkspace,
    false,
    "soft — do not hard-open Workspace shell",
  );

  const tape = readAgentActivityTranscript();
  assert.ok(tape, "activity transcript exists");
  assert.equal(tape!.running, false, "trail finished");
  assert.ok(tape!.events.length >= 1, "trail has steps");

  const graphId = resolveActiveComposerGraphId("너가 세워줘");
  const session = readGlobeChatSession(graphId);
  const expandPrompt = session?.messages.find(
    (m) => m.kind === "slot_prompt" && m.slotId === WORKSPACE_EXPAND_SLOT_ID,
  );
  assert.ok(expandPrompt, "chat offers 「펼치기」chip");

  // Explicit expand path (Node has no localStorage — just assert no throw).
  expandWorkspaceFromTrail(CTX);

  console.log("test-agent-activity-trail: ok");
})();
