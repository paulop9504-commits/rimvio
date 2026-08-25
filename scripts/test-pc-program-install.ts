#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isPcProgramInstallUtterance,
  listAllProgramInstallOffers,
  PC_SETUP_UPDATE_QUERY,
  resolveProgramInstallOffers,
} from "../lib/pc-local-agent/program-install-catalog";
import {
  isPcAppVersionCurrent,
  pcAppNeedsUpdate,
  readReportedPcAppVersion,
} from "../lib/pc-local-agent/pc-app-version";

assert.equal(resolveProgramInstallOffers("호텔 찾아줘").length, 0);
assert.equal(resolveProgramInstallOffers("설치해줘").length, 0);

const pc = resolveProgramInstallOffers("Rimvio PC 설치");
assert.equal(pc.length, 1);
assert.equal(pc[0]?.id, "rimvio-pc");
assert.ok(pc[0]?.url.includes("Rimvio-Setup.exe"));

const cursor = resolveProgramInstallOffers("Cursor 설치해줘");
assert.ok(cursor.some((row) => row.id === "rimvio-pc"));
assert.ok(cursor.some((row) => row.id === "cursor"));

const chrome = resolveProgramInstallOffers("크롬 깔아줘");
assert.ok(chrome.some((row) => row.id === "chrome"));
assert.ok(chrome.some((row) => row.url.includes("chrome_installer.exe")));
assert.ok(!chrome.some((row) => row.url.includes("ChromeStandaloneSetup64")));

const downloadRoute = readFileSync(
  join(process.cwd(), "app/api/pc-agent/programs/download/route.ts"),
  "utf8",
);
assert.ok(downloadRoute.includes("win32-x64-user"));

const all = resolveProgramInstallOffers("필요한 프로그램 설치해줘");
assert.equal(all.length, 3);

assert.equal(isPcProgramInstallUtterance("내 PC 연결"), true);
assert.equal(listAllProgramInstallOffers().length, 3);

const update = resolveProgramInstallOffers(PC_SETUP_UPDATE_QUERY);
assert.equal(update.length, 1);
assert.equal(update[0]?.id, "rimvio-pc");
assert.equal(isPcAppVersionCurrent("0.1.6", "0.1.6"), true);
assert.equal(isPcAppVersionCurrent("0.1.5", "0.1.6"), false);
assert.equal(pcAppNeedsUpdate(null, "0.1.6"), true);
assert.equal(readReportedPcAppVersion({ permissions: { appVersion: "0.1.5" } }), "0.1.5");

const ingest = readFileSync(
  join(process.cwd(), "components/globe/globe-context-ingest-bar.tsx"),
  "utf8",
);
assert.ok(ingest.includes("syncPortalComposeProgramInstallToChat"));
assert.ok(ingest.includes("startPcPurchaseAgentRun"));
assert.ok(!ingest.includes("startPcProgramInstallFlow"));

const chat = readFileSync(
  join(process.cwd(), "components/globe/chat/globe-chat-screen.tsx"),
  "utf8",
);
assert.ok(chat.includes('kind === "program_install"'));
assert.ok(chat.includes("PcProgramInstallList"));

const flow = readFileSync(
  join(process.cwd(), "components/globe/pc-connect-flow.tsx"),
  "utf8",
);
assert.ok(flow.includes("PcProgramInstallList"));
assert.ok(flow.includes("data-pc-connect-flow"));

console.log("pc-program-install ok");
