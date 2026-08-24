/**
 * PC Execution Layer v2 — phase machine, offline park, approval, capabilities.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyReportedPhase,
  canTransitionExecutionPhase,
  isClaimableQueuedPhase,
  isCheckoutResumePhase,
  liveWorkPhaseFromExecution,
  parkTaskForPcOffline,
  resumeTaskAfterPcOnline,
  toDbTaskStatus,
} from "../lib/pc-local-agent/execution-phase";
import {
  assertAllowedBrowserCapability,
  isAllowedBrowserCapability,
  isForbiddenOsCapability,
} from "../lib/pc-local-agent/browser-capabilities";
import {
  canAdvancePurchaseNode,
} from "../lib/pc-local-agent/purchase-graph";
import {
  isPcAgentDemoAllowlistedUrl,
  isPcAgentNavigableUrl,
} from "../lib/pc-local-agent/url-safety";
import { isPcAgentCheckoutUrl } from "../lib/pc-local-agent/purchase-intent";
import { canTransitionTaskStatus } from "../lib/pc-local-agent/task-state-machine";
import {
  clearLiveWorksForTests,
  listInProgressLiveWorks,
  upsertLiveWork,
} from "../lib/globe/live-work/live-work-store";
import { buildGlobeResumeSidebarModel } from "../lib/globe/resume-sidebar/build-globe-resume-sidebar-model";
import { bindPcPurchaseLiveWork } from "../lib/globe/live-work/bind-pc-purchase-work";
import type { PcAgentTask } from "../lib/pc-local-agent/types";

function fakeTask(partial: Partial<PcAgentTask>): PcAgentTask {
  return {
    id: "t1",
    user_id: "u1",
    device_id: "d1",
    type: "OPEN_URL",
    payload: { url: "https://example.com", title: "생수 구매", intent: "purchase" },
    status: "QUEUED",
    result: { phase: "QUEUED" },
    error: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    claimed_by_agent_at: null,
    waiting_expires_at: null,
    ...partial,
  };
}

assert.equal(isPcAgentDemoAllowlistedUrl("https://example.com/"), true);
assert.equal(isPcAgentNavigableUrl("https://example.com"), true);
assert.equal(isPcAgentCheckoutUrl("https://example.com"), false);
assert.equal(isPcAgentNavigableUrl("https://www.coupang.com/vp/checkout"), false);

assert.equal(canTransitionExecutionPhase("QUEUED", "DISPATCHED"), true);
assert.equal(canTransitionExecutionPhase("DISPATCHED", "RUNNING"), true);
assert.equal(canTransitionExecutionPhase("RUNNING", "BROWSER_OPENED"), true);
assert.equal(canTransitionExecutionPhase("BROWSER_OPENED", "PAGE_READY"), true);
assert.equal(canTransitionExecutionPhase("PAGE_READY", "ACTION_RUNNING"), true);
assert.equal(canTransitionExecutionPhase("ACTION_RUNNING", "WAITING_USER"), true);
assert.equal(canTransitionExecutionPhase("WAITING_USER", "APPROVED"), true);
assert.equal(canTransitionExecutionPhase("WAITING_USER", "COMPLETED"), false);
assert.equal(canTransitionExecutionPhase("WAITING_USER", "ACTION_RUNNING"), false);
assert.equal(canTransitionExecutionPhase("ACTION_RUNNING", "COMPLETED"), false);
assert.equal(canTransitionExecutionPhase("ACTION_RUNNING", "VERIFYING"), true);
assert.equal(canTransitionExecutionPhase("VERIFYING", "COMPLETED"), true);
assert.equal(canTransitionExecutionPhase("ACTION_RUNNING", "HUMAN_REQUIRED"), true);
assert.equal(canTransitionExecutionPhase("HUMAN_REQUIRED", "COMPLETED"), false);
assert.equal(canTransitionExecutionPhase("QUEUED", "CANCELLED"), true);
assert.equal(canTransitionTaskStatus("WAITING", "QUEUED"), true);

const approved = applyReportedPhase({
  from: "WAITING_USER",
  to: "APPROVED",
});
assert.equal(approved.ok, true);
if (approved.ok) {
  assert.equal(approved.status, "APPROVED");
}

const blockedPay = applyReportedPhase({
  from: "WAITING_USER",
  to: "COMPLETED",
});
assert.equal(blockedPay.ok, false);

const parkedQueued = parkTaskForPcOffline({
  status: "QUEUED",
  phase: "QUEUED",
});
assert.equal(parkedQueued?.phase, "PC_OFFLINE");
assert.equal(parkedQueued?.status, "PC_OFFLINE");
assert.equal(isClaimableQueuedPhase("PC_OFFLINE"), false);

assert.equal(
  parkTaskForPcOffline({
    status: "WAITING",
    phase: "WAITING_USER",
  }),
  null,
);

const parkedRunning = parkTaskForPcOffline({
  status: "RUNNING",
  phase: "ACTION_RUNNING",
});
assert.equal(parkedRunning?.phase, "PC_OFFLINE");
assert.equal(parkedRunning?.status, "PC_OFFLINE");

const resumed = resumeTaskAfterPcOnline({
  status: "QUEUED",
  phase: "PC_OFFLINE",
});
assert.equal(resumed?.status, "QUEUED");
assert.equal(resumed?.phase, "QUEUED");
assert.equal(isClaimableQueuedPhase("QUEUED"), true);

const resumedInflight = resumeTaskAfterPcOnline({
  status: "WAITING",
  phase: "PC_OFFLINE",
});
assert.equal(resumedInflight?.status, "DISPATCHED");
assert.equal(resumedInflight?.phase, "DISPATCHED");
assert.equal(toDbTaskStatus("DISPATCHED"), "DISPATCHED");

assert.equal(isCheckoutResumePhase("APPROVED"), true);

assert.equal(
  canAdvancePurchaseNode({
    from: "WAITING_USER_APPROVAL",
    to: "CHECKOUT",
    userApproved: false,
  }),
  false,
);
assert.equal(
  canAdvancePurchaseNode({
    from: "WAITING_USER_APPROVAL",
    to: "CHECKOUT",
    userApproved: true,
  }),
  true,
);

assert.equal(isAllowedBrowserCapability("browser.click"), true);
assert.equal(isForbiddenOsCapability("shell.exec"), true);
assert.equal(isForbiddenOsCapability("os.spawn"), true);
try {
  assertAllowedBrowserCapability("shell.exec");
  throw new Error("should_deny_shell");
} catch (err) {
  assert.ok(err instanceof Error && err.message.includes("capability_denied"));
}

assert.equal(liveWorkPhaseFromExecution("WAITING_USER"), "needs_approval");
assert.equal(liveWorkPhaseFromExecution("PC_OFFLINE"), "waiting_pc");
assert.equal(liveWorkPhaseFromExecution("HUMAN_REQUIRED"), "needs_approval");

clearLiveWorksForTests();
bindPcPurchaseLiveWork({
  contextEventId: "ctx-water",
  deviceName: "내 PC",
  task: fakeTask({
    status: "WAITING",
    result: { phase: "WAITING_USER", latestEvent: "review" },
  }),
});
assert.equal(listInProgressLiveWorks().length, 1);
assert.equal(listInProgressLiveWorks()[0]?.statusLine.includes("승인") || listInProgressLiveWorks()[0]?.phase === "needs_approval", true);

const model = buildGlobeResumeSidebarModel({ nowMs: Date.now(), maxFriends: 0 });
assert.equal(model.inProgress.length, 1);

clearLiveWorksForTests();
upsertLiveWork({
  id: "pc:off",
  contextEventId: "ctx-off",
  kind: "pc_execution",
  title: "생수 구매",
  glyph: "🛒",
  phase: "waiting_pc",
  statusLine: "PC 연결 대기 중",
  pcTaskId: "off",
  deviceName: "내 PC",
});
assert.equal(listInProgressLiveWorks().length, 1);
assert.ok(
  buildGlobeResumeSidebarModel({ nowMs: Date.now(), maxFriends: 0 }).inProgress.some(
    (row) => row.workPhase === "waiting_pc",
  ),
);

const listSrc = readFileSync(
  join(process.cwd(), "components/globe/globe-resume-sidebar-list.tsx"),
  "utf8",
);
assert.ok(listSrc.includes("data-globe-resume-in-progress"));
assert.ok(listSrc.includes("GlobeResumeDeviceSection"));
assert.ok(!listSrc.includes("Agent Dashboard"));

const deviceSrc = readFileSync(
  join(process.cwd(), "components/globe/globe-resume-device-section.tsx"),
  "utf8",
);
assert.ok(deviceSrc.includes("data-globe-resume-devices"));
assert.ok(!deviceSrc.includes("Device Dashboard"));

const realtimeSrc = readFileSync(
  join(process.cwd(), "lib/pc-local-agent/client-realtime.ts"),
  "utf8",
);
assert.ok(realtimeSrc.includes("pc_local_agent_tasks"));
assert.ok(realtimeSrc.includes("subscribePcAgentTasksRealtime"));

const previewSrc = readFileSync(
  join(process.cwd(), "components/pc-continuity-preview-card.tsx"),
  "utf8",
);
assert.ok(previewSrc.includes('action: "approve"'));
assert.ok(previewSrc.includes("screenshotJpeg"));
assert.ok(previewSrc.includes("data-pc-screen-toggle"));

clearLiveWorksForTests();
console.log("pc-execution-layer-v2 ok");
