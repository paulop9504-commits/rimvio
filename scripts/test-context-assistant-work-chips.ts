#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildContextAssistantWorkChips } from "../lib/globe/assistant/build-context-assistant-work-chips";
import type { HubAction } from "../lib/globe/resource/hub-action-record";

const log: HubAction[] = [
  {
    actionId: "a1",
    contextEventId: "evt-1",
    resourceId: null,
    type: "search",
    status: "success",
    sourceHubId: "lodging",
    createdAt: "2026-07-22T10:00:00.000Z",
    payload: { query: "capsule" },
  },
  {
    actionId: "a2",
    contextEventId: "evt-1",
    resourceId: "r1",
    type: "reserve",
    status: "pending",
    sourceHubId: "lodging",
    createdAt: "2026-07-22T11:00:00.000Z",
    payload: { slot: { start: "2026-08-01", end: "2026-08-02" } },
  },
];

const withLive = buildContextAssistantWorkChips({
  hubLog: log,
  liveLabelKo: "찾는 중…",
  max: 5,
});
assert.equal(withLive[0]?.id, "live");
assert.equal(withLive[0]?.status, "pending");
assert.equal(withLive[1]?.id, "a2");
assert.equal(withLive[2]?.id, "a1");

const idle = buildContextAssistantWorkChips({ hubLog: log });
assert.equal(idle[0]?.id, "a2");
assert.equal(idle.length, 2);

const empty = buildContextAssistantWorkChips({ hubLog: [] });
assert.equal(empty.length, 0);

console.log("test-context-assistant-work-chips: ok");
