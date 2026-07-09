import assert from "node:assert/strict";
import {
  appendScoutFeedGateTurn,
  markScoutFeedGateOpened,
  readContextAgentComposeThread,
} from "../lib/globe/assistant/context-agent-compose-thread-store";
import { copy } from "../lib/copy/human-ko";

const eventId = "evt-scout-feed-gate-test";

appendScoutFeedGateTurn(eventId, {
  summaryKo: "근처 초밥 3곳",
  count: 3,
  batchId: "batch-scout-1",
});

const turns = readContextAgentComposeThread(eventId);
assert.equal(turns.length, 1);
const gateTurn = turns[0];
assert.ok(
  gateTurn &&
    gateTurn.role === "assistant" &&
    gateTurn.kind === "scout_feed_gate",
);
if (
  gateTurn &&
  gateTurn.role === "assistant" &&
  gateTurn.kind === "scout_feed_gate"
) {
  assert.equal(gateTurn.payload.summaryKo, "근처 초밥 3곳");
  assert.equal(gateTurn.payload.count, 3);
  assert.equal(gateTurn.payload.batchId, "batch-scout-1");
  assert.equal(gateTurn.payload.status, "open");

  markScoutFeedGateOpened(eventId, gateTurn.id);
  const opened = readContextAgentComposeThread(eventId)[0];
  assert.ok(
    opened &&
      opened.role === "assistant" &&
      opened.kind === "scout_feed_gate",
  );
  if (
    opened &&
    opened.role === "assistant" &&
    opened.kind === "scout_feed_gate"
  ) {
    assert.equal(opened.payload.status, "opened");
  }
}

assert.ok(copy.globe.scoutFeedGateConfirmCta.length > 0);
assert.ok(copy.globe.scoutFeedGateIntro(3).length > 0);

console.log("test-scout-cards-compose: ok");
