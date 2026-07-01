import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  dispatchExecutionFeedClear,
  dispatchExecutionFeedGoal,
  readExecutionFeedState,
} from "../lib/context-run/execution-feed-bridge";
import { clearRunState, ensureRunState } from "../lib/context-run/run-state-store";
import { syncIntentSupplyAckToFeed } from "../lib/context-run/sync-intent-supply-to-feed";
import { resolveActiveComposerGraphId } from "../lib/context-run/resolve-active-composer-graph-id";

const root = join(import.meta.dirname, "..");

dispatchExecutionFeedClear();
clearRunState();

const goalKo = "지도에 맥락 연결해줘";
const graphId = "composer:abc12345";

ensureRunState({ graphId, goal: goalKo });
dispatchExecutionFeedGoal({ graphId, goalKo });

syncIntentSupplyAckToFeed(
  {
    eventId: "evt-new-event-id",
    intentKind: "context_connect",
    intentLabelKo: "맥락 연결",
    summaryKo: "「독일 · 5시간 2분 체류」 맥락을 지도에 연결했어요",
    signalChips: ["📍 현재 위치"],
    suppliedResourceCount: 1,
  },
  goalKo,
);

const state = readExecutionFeedState();
assert.equal(state.run?.graphId, graphId, "ack feed must use active run graphId");
assert.equal(
  state.run?.artifact?.summaryLineKo,
  "「독일 · 5시간 2분 체류」 맥락을 지도에 연결했어요",
);
assert.equal(
  resolveActiveComposerGraphId(goalKo),
  graphId,
  "resolver must prefer active run",
);

const dispatch = readFileSync(join(root, "lib/context-run/dispatch-context-run.ts"), "utf8");
assert.ok(
  dispatch.includes("syncPortalComposeTurnToChat"),
  "map/experience turns must sync into chat thread",
);

const home = readFileSync(join(root, "components/globe/globe-home-client.tsx"), "utf8");
assert.ok(!home.includes("openGlobeChat();\n            memoryRecallComposeRef"), "chat must not open on compose focus");

dispatchExecutionFeedClear();
clearRunState();

console.log("test-globe-chat-pipeline: ok");
