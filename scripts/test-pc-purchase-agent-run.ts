#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  chromeExecutableCandidates,
  chromeSetupDownloadUrl,
} from "../lib/pc-local-agent/host-chrome";
import {
  clearPendingPcPurchase,
  readPendingPcPurchase,
  writePendingPcPurchase,
} from "../lib/pc-local-agent/pending-purchase-intent";
import {
  PC_PURCHASE_PROGRAM_QUERY,
  programsForPcPurchaseRun,
  resolveProgramInstallOffers,
} from "../lib/pc-local-agent/program-install-catalog";
import { copy } from "../lib/copy/human-ko";

assert.equal(resolveProgramInstallOffers("쿠팡에서 물 사").length, 0);
const needed = programsForPcPurchaseRun();
assert.equal(needed.length, 2);
assert.ok(needed.some((row) => row.id === "rimvio-pc"));
assert.ok(needed.some((row) => row.id === "chrome"));
assert.ok(!needed.some((row) => row.id === "cursor"));
assert.deepEqual(
  resolveProgramInstallOffers(PC_PURCHASE_PROGRAM_QUERY).map((row) => row.id),
  ["rimvio-pc", "chrome"],
);

const paths = chromeExecutableCandidates({
  LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local",
  PROGRAMFILES: "C:\\Program Files",
});
assert.ok(paths.some((p) => p.includes("Google\\Chrome\\Application\\chrome.exe") || p.includes("Google/Chrome/Application/chrome.exe")));
assert.ok(chromeSetupDownloadUrl().includes("chrome_installer.exe"));
assert.ok(!chromeSetupDownloadUrl().includes("ChromeStandaloneSetup64"));

clearPendingPcPurchase();
writePendingPcPurchase({ utterance: "쿠팡에서 물 사", contextEventId: "ctx1" });
assert.equal(readPendingPcPurchase()?.utterance, "쿠팡에서 물 사");
clearPendingPcPurchase();
assert.equal(readPendingPcPurchase(), null);

assert.ok(!/이어서 할 수 있어요/.test(copy.globe.pcContinuity.needPc));
assert.ok(!/이어서 할 수 있어요/.test(copy.globe.pcContinuity.waitingPcQueued));
assert.ok(!/이어서 할 수 있어요/.test(copy.globe.liveWorkWaitingPc));
assert.match(copy.globe.pcContinuity.agentWaitingOnline, /멈추지 않고/);

const ingest = readFileSync(
  join(process.cwd(), "components/globe/globe-context-ingest-bar.tsx"),
  "utf8",
);
assert.ok(ingest.includes("startPcPurchaseAgentRun"));
assert.ok(!ingest.includes('kind === "blocked"'));

const agent = readFileSync(
  join(process.cwd(), "lib/pc-local-agent/run-purchase-agent.ts"),
  "utf8",
);
assert.ok(agent.includes("beginAgentActivityTrail"));
assert.ok(agent.includes("ensurePcPurchaseAgentWatch"));
assert.ok(agent.includes("agentQueued"));
assert.ok(agent.includes("agentNeedLatest"));
assert.ok(agent.includes("PC_SETUP_UPDATE_QUERY"));

assert.match(copy.globe.pcContinuity.started("생수 구매", "내 PC"), /구매를 실행/);
assert.ok(!/구매을/.test(copy.globe.pcContinuity.started("생수 구매", "내 PC")));

const systemEngine = readFileSync(
  join(process.cwd(), "apps/local-agent/src/execution/system-browser-engine.ts"),
  "utf8",
);
assert.ok(systemEngine.includes("captureDesktopJpegBase64"));
assert.ok(systemEngine.includes("snapshot"));
assert.ok(!systemEngine.includes("playwright"));

const capture = readFileSync(
  join(process.cwd(), "apps/local-agent/src/execution/capture-desktop.ts"),
  "utf8",
);
assert.ok(capture.includes("PrimaryScreen"));
assert.ok(capture.includes("image/jpeg"));

console.log("pc-purchase-agent-run ok");
