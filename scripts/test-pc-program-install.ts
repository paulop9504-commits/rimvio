#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isPcProgramInstallUtterance,
  listAllProgramInstallOffers,
  resolveProgramInstallOffers,
} from "../lib/pc-local-agent/program-install-catalog";

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

const all = resolveProgramInstallOffers("필요한 프로그램 설치해줘");
assert.equal(all.length, 3);

assert.equal(isPcProgramInstallUtterance("내 PC 연결"), true);
assert.equal(listAllProgramInstallOffers().length, 3);

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
