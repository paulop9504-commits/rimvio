/**
 * Workspace Fact Query dispatch — bypasses Workspace Agent for deterministic facts.
 * Run: npx tsx scripts/test-workspace-fact-query.ts
 */

import assert from "node:assert/strict";
import { clearFactProjectionForTests } from "../lib/fact-query";
import { tryDispatchWorkspaceFactQueryTurn } from "../lib/context-workspace/dispatch-workspace-fact-query-turn";
import {
  appendWorkspaceChatTurn,
  clearWorkspaceChatForTests,
  readWorkspaceChat,
} from "../lib/context-workspace/workspace-chat-store";

async function main(): Promise<void> {
  const EVENT_ID = "ctx-ws-fact-test";

  clearWorkspaceChatForTests();
  clearFactProjectionForTests();

  appendWorkspaceChatTurn({
    contextEventId: EVENT_ID,
    role: "user",
    text: "도쿄 지하철 환승 최다 역",
  });
  assert.equal(
    await tryDispatchWorkspaceFactQueryTurn({
      contextEventId: EVENT_ID,
      text: "도쿄 지하철 환승 최다 역",
    }),
    true,
  );
  let turns = readWorkspaceChat(EVENT_ID);
  assert.equal(turns.length, 2);
  assert.equal(turns[1]!.role, "assistant");
  assert.ok(turns[1]!.factAnswer);
  assert.equal(turns[1]!.factAnswer!.kind, "transit_max_interchange");

  clearWorkspaceChatForTests(EVENT_ID);
  clearFactProjectionForTests();

  appendWorkspaceChatTurn({
    contextEventId: EVENT_ID,
    role: "user",
    text: "강남과 홍대 중간 만남",
  });
  assert.equal(
    await tryDispatchWorkspaceFactQueryTurn({
      contextEventId: EVENT_ID,
      text: "강남과 홍대 중간 만남",
    }),
    true,
  );
  turns = readWorkspaceChat(EVENT_ID);
  assert.ok(turns[1]!.factAnswer);
  assert.equal(turns[1]!.factAnswer!.kind, "midpoint_meeting");
  assert.equal(turns[1]!.factAnswer!.evidence.length, 3);

  clearWorkspaceChatForTests(EVENT_ID);

  console.log("OK — workspace-fact-query");
}

void main();
