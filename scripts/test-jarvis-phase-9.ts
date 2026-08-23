/**
 * Jarvis Phase 4 — Agent Runtime verification/repair + bg: tasks.
 * Run: npx tsx scripts/test-jarvis-phase-9.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { COMMIT_SCHEDULE_FEASIBILITY_META_KEY } from "../lib/workstream/build-commit-feasibility";
import {
  BG_TASK_ID_PREFIX,
  clearAgentRuntimeEventLogForTests,
  clearBackgroundTasksForTests,
  clearLastRimvioAgentRuntimeTurnForTests,
  dispatchBackgroundTask,
  enterRimvioAgentRuntime,
  ensureAgentExecutionStateManager,
  isBackgroundTaskId,
  readAgentRuntimeEventLog,
  readBackgroundTasks,
  refreshAgentExecutionStateSnapshot,
  runBackgroundAgentVerification,
  runVerificationThenRepair,
  stopAgentExecutionStateManagerForTests,
  verifyUsjLateArrivalDemo,
} from "../lib/workstream";

clearLastRimvioAgentRuntimeTurnForTests();
clearAgentRuntimeEventLogForTests();
clearBackgroundTasksForTests();
stopAgentExecutionStateManagerForTests();

{
  assert.ok(isBackgroundTaskId(`${BG_TASK_ID_PREFIX}verify_schedule:ctx-1`));
  const record = dispatchBackgroundTask({
    kind: "observe_world",
    contextEventId: "ctx-bg-1",
    labelKo: "World observe",
    sync: true,
    run: () => {
      /* noop */
    },
  });
  assert.ok(record.id.startsWith(BG_TASK_ID_PREFIX));
  assert.equal(record.status, "done");
  const tasks = readBackgroundTasks({ contextEventId: "ctx-bg-1" });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]!.status, "done");
}

{
  const blocked = verifyUsjLateArrivalDemo();
  const report = runVerificationThenRepair({
    contextEventId: "ctx-repair",
    feasibility: {
      activityLabelKo: "USJ",
      activityLat: 34.6654,
      activityLng: 135.4323,
      anchorLabelKo: "난바 호텔",
      anchorLat: 34.662,
      anchorLng: 135.5013,
      leaveReadyMinutes: 18 * 60,
      activityCloseMinutes: 18 * 60,
      transitKmh: 15,
      maxTravelMinutes: 40,
    },
  });
  assert.equal(report.blocked, blocked.blocked);
}

{
  const event = {
    id: "ctx-feas",
    title: "오사카",
    place: "오사카",
    category: "travel",
    source: "message",
    lifecycle: "active",
    confidence: 0.9,
    metadata: {
      [COMMIT_SCHEDULE_FEASIBILITY_META_KEY]: {
        activityLabelKo: "USJ",
        activityLat: 34.6654,
        activityLng: 135.4323,
        anchorLabelKo: "난바 호텔",
        anchorLat: 34.662,
        anchorLng: 135.5013,
        leaveReadyMinutes: 18 * 60,
        activityCloseMinutes: 18 * 60,
        transitKmh: 15,
        maxTravelMinutes: 40,
      },
    },
    lifecycleUpdatedAt: "2026-07-30T00:00:00.000Z",
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
  } as EventCandidate;

  ensureAgentExecutionStateManager();
  const result = runBackgroundAgentVerification({
    contextEventId: "ctx-feas",
    event,
  });
  assert.equal(result.ranFeasibility, true);
  assert.equal(result.report.blocked, true);

  const snap = refreshAgentExecutionStateSnapshot({
    contextEventId: "ctx-feas",
    event,
  });
  assert.equal(snap.contextEventId, "ctx-feas");
  assert.ok(snap.executionState.taskGraph.tasks.length >= 1);
  assert.ok(snap.brain.statusBrief.includes("[Agent Status]"));
}

{
  clearAgentRuntimeEventLogForTests();
  clearBackgroundTasksForTests();
  ensureAgentExecutionStateManager();

  enterRimvioAgentRuntime({
    source: "action-chat",
    contextEventId: "ctx-runtime-verify",
    utterance: "오사카 4박5일 여행 준비해줘",
  });

  const log = readAgentRuntimeEventLog({ contextEventId: "ctx-runtime-verify" });
  assert.ok(log.some((e) => e.kind === "bg_task_queued"));
  assert.ok(log.some((e) => e.kind === "intent_received"));

  const bgTasks = readBackgroundTasks({ contextEventId: "ctx-runtime-verify" });
  assert.ok(bgTasks.length >= 1);
  assert.ok(bgTasks[0]!.id.startsWith(BG_TASK_ID_PREFIX));
}

stopAgentExecutionStateManagerForTests();
clearBackgroundTasksForTests();

console.log("OK — jarvis-phase-9");
