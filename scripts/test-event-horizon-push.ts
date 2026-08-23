import assert from "node:assert/strict";
import { upsertUserStatus, resetUserStatusForTests } from "../lib/global-brain/user-status-store";
import { buildLifeContextSnapshot } from "../lib/event-horizon/build-life-context-snapshot";
import {
  formatEventHorizonNudgeCopy,
  deriveLoopContextKo,
} from "../lib/guardian-copy/jarvis-copy-ssot";
import { resolveEventHorizonPush } from "../lib/event-horizon/resolve-event-horizon-push";
import { tryEventHorizonProactiveResult } from "../lib/event-horizon/orchestrate-proactive-nudge";

resetUserStatusForTests();

const tiredStatus = upsertUserStatus({
  flag: "tired",
  label: "에너지 고갈",
  vitality: "Haven",
  sourceMessage: "피곤해",
});

const snapshot = buildLifeContextSnapshot({
  referenceDate: "2026-08-23",
  existingSchedule: [
    { time: "09:00", task: "팀 미팅" },
    { time: "11:00", task: "프로젝트 작업" },
    { time: "14:00", task: "클라이언트 회의" },
    { time: "16:00", task: "리포트 작성" },
  ],
  userStatus: tiredStatus,
  now: new Date("2026-08-23T08:30:00"),
});

assert.ok(snapshot.eventHorizon.length >= 1);
const insight = snapshot.eventHorizon[0]!;

{
  const jarvis = formatEventHorizonNudgeCopy({
    insight,
    snapshot,
    tone: "jarvis",
  });
  assert.equal(jarvis.tone, "jarvis");
  assert.match(jarvis.headline, /일정|밀도|과부하/u);
  assert.equal(jarvis.primaryActionLabel, "일정 재배치");

  const partner = formatEventHorizonNudgeCopy({
    insight,
    snapshot,
    tone: "partner",
  });
  assert.notEqual(partner.headline, jarvis.headline);
  assert.equal(partner.primaryActionLabel, "일정 조정하기");
}

{
  const ready = resolveEventHorizonPush({
    snapshot,
    dateKey: "2026-08-23",
    dismissedForDateKey: null,
    suppressForMorningUnlock: false,
    tone: "jarvis",
  });
  assert.equal(ready.visible, true);
  assert.equal(ready.reason, "ready");
  assert.ok(ready.copy);
}

{
  const suppressed = resolveEventHorizonPush({
    snapshot,
    dateKey: "2026-08-23",
    dismissedForDateKey: null,
    suppressForMorningUnlock: true,
    tone: "jarvis",
  });
  assert.equal(suppressed.visible, false);
  assert.equal(suppressed.reason, "morning_unlock_suppressed");
}

{
  const chat = tryEventHorizonProactiveResult({
    message: "안녕",
    snapshot,
  });
  assert.ok(chat);
  assert.match(chat!.summary, /일정|상태|에너지/u);
}

{
  const jarvisLoop = deriveLoopContextKo("MORNING_LOOP", "jarvis");
  const partnerLoop = deriveLoopContextKo("MORNING_LOOP", "partner");
  assert.ok(jarvisLoop);
  assert.ok(partnerLoop);
  assert.notEqual(jarvisLoop, partnerLoop);
}

console.log("test-event-horizon-push: ok");
