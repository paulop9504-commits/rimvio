#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  derivePcOnboardingPhase,
  onboardingChecklist,
} from "../lib/pc-local-agent/onboarding-phase";
import { generateDisplayPairingCode } from "../lib/pc-local-agent/token";
import { isDesktopConnectNonce } from "../lib/pc-local-agent/desktop-connect";

assert.equal(
  derivePcOnboardingPhase({
    setupDownloaded: false,
    health: null,
    pairingRequested: false,
    pairingBusy: false,
    connectedThisSession: false,
    newCloudDeviceAfterStart: false,
    localUnpaired: false,
  }),
  "INSTALL",
);

assert.equal(
  derivePcOnboardingPhase({
    setupDownloaded: true,
    health: null,
    pairingRequested: false,
    pairingBusy: false,
    connectedThisSession: false,
    newCloudDeviceAfterStart: false,
    localUnpaired: false,
  }),
  "AGENT_STARTING",
);

assert.equal(
  derivePcOnboardingPhase({
    setupDownloaded: true,
    health: { ok: true, paired: false, phase: "starting" },
    pairingRequested: false,
    pairingBusy: false,
    connectedThisSession: false,
    newCloudDeviceAfterStart: false,
    localUnpaired: true,
  }),
  "AGENT_ONLINE",
);

assert.equal(
  derivePcOnboardingPhase({
    setupDownloaded: true,
    health: { ok: true, paired: false, phase: "pairing_required" },
    pairingRequested: false,
    pairingBusy: false,
    connectedThisSession: false,
    newCloudDeviceAfterStart: true,
    localUnpaired: true,
  }),
  "PAIRING_REQUIRED",
  "install must not attach an account until the signed-in user is present on this machine",
);

assert.equal(
  derivePcOnboardingPhase({
    setupDownloaded: true,
    health: { ok: true, paired: false },
    pairingRequested: true,
    pairingBusy: true,
    connectedThisSession: false,
    newCloudDeviceAfterStart: false,
    localUnpaired: true,
  }),
  "PAIRING",
);

assert.equal(
  derivePcOnboardingPhase({
    setupDownloaded: true,
    health: { ok: true, paired: true },
    pairingRequested: true,
    pairingBusy: false,
    connectedThisSession: false,
    newCloudDeviceAfterStart: false,
    localUnpaired: false,
  }),
  "CONNECTED",
);

const list = onboardingChecklist("PAIRING_REQUIRED");
assert.equal(list.find((row) => row.id === "find")?.done, true);
assert.equal(list.find((row) => row.id === "account")?.current, true);
assert.equal(list.find((row) => row.id === "done")?.done, false);

const code = generateDisplayPairingCode();
assert.match(code, /^[A-Z0-9]{4}-[A-Z0-9]{2}$/);

assert.equal(isDesktopConnectNonce("1"), false);
assert.equal(isDesktopConnectNonce("true"), false);
assert.equal(isDesktopConnectNonce(null), false);
assert.equal(isDesktopConnectNonce("abcdefghijklmnop"), true);

const adopt = readFileSync(
  join(process.cwd(), "lib/pc-local-agent/adopt-logged-in-pc.ts"),
  "utf8",
);
assert.ok(adopt.includes("consent: true"));

const flow = readFileSync(join(process.cwd(), "components/globe/pc-connect-flow.tsx"), "utf8");
assert.ok(flow.includes("data-pc-connect-phase"));
assert.ok(flow.includes("adoptLoggedInPc"));
assert.ok(!flow.includes('setStep("done")'));
assert.ok(!flow.includes("Rimvio PC Agent"));

const desktopMain = readFileSync(
  join(process.cwd(), "apps/local-agent/src/desktop-main.ts"),
  "utf8",
);
assert.ok(desktopMain.includes("SystemBrowserEngine"));
assert.ok(desktopMain.includes("startPairedWorkLoops"));
assert.ok(!desktopMain.includes("playwright"));
assert.ok(!desktopMain.includes("createExecutionEngine"));

const paired = readFileSync(
  join(process.cwd(), "apps/local-agent/src/run-paired-agent.ts"),
  "utf8",
);
assert.ok(paired.includes("Heartbeat started"));
assert.ok(paired.includes("kickPairedWorkPoll"));
assert.ok(paired.includes("claimTask"));

const desktop = readFileSync(join(process.cwd(), "apps/pc-desktop/package.json"), "utf8");
assert.ok(desktop.includes("Rimvio-Setup.exe"));
assert.ok(desktop.includes("runAfterFinish"));
assert.ok(desktop.includes("src/ui/**"));
assert.ok(desktop.includes("preload.cjs"));
assert.ok(desktop.includes("build/icon.png"));
assert.ok(desktop.includes("0.1.6"));
assert.ok(existsSync(join(process.cwd(), "apps/pc-desktop/build/icon.png")));
assert.ok(desktop.includes('"provider": "github"'));

const desktopMainJs = readFileSync(
  join(process.cwd(), "apps/pc-desktop/src/main.cjs"),
  "utf8",
);
assert.ok(desktopMainJs.includes("checkForUpdates"));
assert.ok(desktopMainJs.includes("setLoginItemSettings"));
assert.ok(desktopMainJs.includes("BrowserWindow"));
assert.ok(desktopMainJs.includes("backgroundColor"));
assert.ok(desktopMainJs.includes("shell.html"));
assert.ok(desktopMainJs.includes("38472/run"));
assert.ok(desktopMainJs.includes("pc-run"));

const shellHtml = readFileSync(
  join(process.cwd(), "apps/pc-desktop/src/ui/shell.html"),
  "utf8",
);
assert.ok(shellHtml.includes("이어서 말하기"));
assert.ok(shellHtml.includes("pip-title"));
assert.ok(!shellHtml.includes("Local Agent"));
assert.ok(!shellHtml.includes("GPT-"));

const shellJs = readFileSync(
  join(process.cwd(), "apps/pc-desktop/src/ui/shell.js"),
  "utf8",
);
assert.ok(shellJs.includes("rimvioPc.run"));

const pairing = readFileSync(
  join(process.cwd(), "apps/local-agent/src/pairing-server.ts"),
  "utf8",
);
assert.ok(pairing.includes('pathname === "/work"'));
assert.ok(pairing.includes('pathname === "/run"'));
assert.ok(pairing.includes("createSelfTask"));

const remoteUi = readFileSync(
  join(process.cwd(), "components/globe/pc-remote-chat-overlay.tsx"),
  "utf8",
);
assert.ok(remoteUi.includes("data-pc-remote-chat"));
assert.ok(remoteUi.includes("PcContinuityPreviewCard"));
assert.ok(!remoteUi.includes("Local Agent"));

const dock = readFileSync(
  join(process.cwd(), "components/globe/globe-capture-dock.tsx"),
  "utf8",
);
assert.ok(dock.includes("PcRemoteChatOverlay"));
assert.ok(dock.includes("data-pc-remote-open"));

const setupUrl = readFileSync(join(process.cwd(), "lib/pc-local-agent/setup-url.ts"), "utf8");
assert.ok(setupUrl.includes("releases/download/rimvio-pc-"));
assert.ok(setupUrl.includes("RIMVIO_PC_SETUP_VERSION"));
assert.ok(setupUrl.includes("0.1.6"));

console.log("pc-onboarding-phase ok");
