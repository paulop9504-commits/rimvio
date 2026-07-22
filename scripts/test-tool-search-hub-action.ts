#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { emitToolSearchHubAction } from "../lib/graph-command/emit-tool-search-hub-action";
import { formatHubActionTimelineLabel } from "../lib/globe/resource/format-hub-action-timeline";
import {
  clearHubActionLog,
  readHubActionLog,
} from "../lib/globe/resource/hub-action-record-store";
import { buildContextAssistantWorkChips } from "../lib/globe/assistant/build-context-assistant-work-chips";
import { getRimvioTool } from "../lib/tool-registry/invoke-rimvio-tool";

const contextEventId = "evt-step2-tool-diff";
clearHubActionLog(contextEventId);

emitToolSearchHubAction({
  contextEventId,
  toolId: "hotel.lookup",
  domain: "lodging",
  query: "오사카 캡슐호텔",
  candidateCount: 3,
});

const log = readHubActionLog(contextEventId);
assert.equal(log.length, 1);
assert.equal(log[0]?.type, "search");
assert.equal(log[0]?.externalRef, "hotel.lookup");
assert.equal(log[0]?.status, "success");
assert.equal(formatHubActionTimelineLabel(log[0]!), "숙소 찾기");
assert.equal(getRimvioTool("hotel.lookup")?.labelKo, "숙소 찾기");

const chips = buildContextAssistantWorkChips({ hubLog: log });
assert.equal(chips[0]?.labelKo, "숙소 찾기");

clearHubActionLog(contextEventId);
emitToolSearchHubAction({
  contextEventId,
  toolId: "restaurant.lookup",
  domain: "eatery",
  query: "난바 맛집",
  candidateCount: 0,
});
const empty = readHubActionLog(contextEventId);
assert.equal(empty[0]?.status, "failed");
assert.equal(formatHubActionTimelineLabel(empty[0]!), "맛집 찾기");

console.log("test-tool-search-hub-action: ok");
