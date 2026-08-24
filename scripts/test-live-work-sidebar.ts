#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clearLiveWorksForTests,
  listInProgressLiveWorks,
  listRecentCompletedLiveWorks,
  upsertLiveWork,
} from "@/lib/globe/live-work/live-work-store";
import { LIVE_WORK_RECENT_HIGHLIGHT_MS } from "@/lib/globe/live-work/types";
import { buildGlobeResumeSidebarModel } from "@/lib/globe/resume-sidebar/build-globe-resume-sidebar-model";
import { canTransitionTaskStatus } from "@/lib/pc-local-agent/task-state-machine";

clearLiveWorksForTests();
upsertLiveWork({
  id: "pc:t1",
  contextEventId: "ctx-water",
  kind: "pc_execution",
  title: "생수 구매",
  glyph: "🛒",
  phase: "running",
  statusLine: "실행 중",
  pcTaskId: "t1",
  deviceName: "내 PC",
});
assert.equal(listInProgressLiveWorks().length, 1);
assert.equal(listRecentCompletedLiveWorks().length, 0);

const liveModel = buildGlobeResumeSidebarModel({ nowMs: Date.now(), maxFriends: 0 });
assert.equal(liveModel.inProgress.length, 1);
assert.equal(liveModel.inProgress[0]?.contextEventId, "ctx-water");
assert.ok(liveModel.recent.every((row) => row.contextEventId !== "ctx-water"));

upsertLiveWork({
  id: "pc:t1",
  contextEventId: "ctx-water",
  kind: "pc_execution",
  title: "생수 구매",
  glyph: "🛒",
  phase: "done",
  statusLine: "완료",
  pcTaskId: "t1",
  deviceName: "내 PC",
});
assert.equal(listInProgressLiveWorks().length, 0);
assert.equal(listRecentCompletedLiveWorks().length, 1);

const doneModel = buildGlobeResumeSidebarModel({ nowMs: Date.now(), maxFriends: 0 });
assert.equal(doneModel.inProgress.length, 0);
assert.ok(doneModel.recent.some((row) => row.contextEventId === "ctx-water"));

assert.equal(canTransitionTaskStatus("RUNNING", "CANCELLED"), true);

const list = readFileSync(
  join(process.cwd(), "components/globe/globe-resume-sidebar-list.tsx"),
  "utf8",
);
assert.ok(list.includes("data-globe-resume-in-progress"));
assert.ok(list.includes("data-live-work-inspect"));
assert.ok(!list.includes("Agent Dashboard"));

const button = readFileSync(
  join(process.cwd(), "components/globe/globe-container-space-button.tsx"),
  "utf8",
);
assert.ok(button.includes("data-live-work-count"));

void LIVE_WORK_RECENT_HIGHLIGHT_MS;
clearLiveWorksForTests();
console.log("ok — live work sidebar");
