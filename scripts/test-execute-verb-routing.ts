#!/usr/bin/env npx tsx
/**
 * Globe execute-intent routing — 「계획 너가 세워줘」must be workspace_agent.
 * Run: npx tsx scripts/test-execute-verb-routing.ts
 */
import assert from "node:assert/strict";
import { bindSituation } from "@/lib/context-run/bind-situation";
import { planContextRun } from "@/lib/context-run/plan-context-run";
import { isAgentExecuteVerbUtterance } from "@/lib/context-run/is-agent-execute-verb";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { isNewTripGlobeIngressUtterance } from "@/lib/context-run/is-new-trip-globe-ingress-utterance";
import { resolveRecentTravelDestinationHint } from "@/lib/context-run/resolve-recent-travel-destination-hint";
import {
  appendGlobeChatTextMessage,
  resetGlobeChatSessionStoreForTests,
} from "@/lib/globe/chat/globe-chat-session-store";
import { resolveActiveComposerGraphId } from "@/lib/context-run/resolve-active-composer-graph-id";
import {
  clearPortalComposeRunState,
  writePortalComposeRunState,
} from "@/lib/portal/portal-compose-run-store";

function planKind(text: string) {
  return planContextRun(
    bindSituation({
      kind: "text",
      text,
      surface: "composer",
      layerMode: "personal",
    }),
  ).kind;
}

assert.equal(isNewTripGlobeIngressUtterance("제주도 서귀포로 놀러감"), true);
assert.equal(planKind("제주도 서귀포로 놀러감"), "globe_ingress");

assert.equal(isAgentExecuteVerbUtterance("계획 너가 세워줘"), true);
assert.equal(isWorkspaceAgentWorkUtterance("계획 너가 세워줘"), true);
assert.equal(planKind("계획 너가 세워줘"), "workspace_agent");

assert.equal(isAgentExecuteVerbUtterance("일정 짜줘"), true);
assert.equal(isAgentExecuteVerbUtterance("너가 계획 세워줘"), true);

// Chat history dest → bare execute inherits Seogwipo.
resetGlobeChatSessionStoreForTests();
const gid = resolveActiveComposerGraphId("hint");
appendGlobeChatTextMessage({
  graphId: gid,
  role: "user",
  text: "제주도 서귀포로 놀러감",
});
assert.equal(resolveRecentTravelDestinationHint("계획 세워줘", gid), "서귀포");
assert.equal(isAgentExecuteVerbUtterance("너가 세워줘"), true);
assert.equal(planKind("너가 세워줘"), "workspace_agent");

// Portal conversing must not swallow execute verbs.
clearPortalComposeRunState();
writePortalComposeRunState({
  graphId: "portal_trap",
  intentId: "together",
  categoryId: "travel",
  composeSeed: "",
  accumulatedText: "",
  eventId: "evt_trap",
  pendingSlotId: null,
  askedCount: 1,
  status: "conversing",
  updatedAt: new Date().toISOString(),
});
assert.equal(planKind("계획 너가 세워줘"), "workspace_agent");
clearPortalComposeRunState();

console.log("test-execute-verb-routing: ok");
