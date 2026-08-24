#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  derivePcOnboardingPhase,
  onboardingChecklist,
} from "../lib/pc-local-agent/onboarding-phase";
import { generateDisplayPairingCode } from "../lib/pc-local-agent/token";

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
  "install must not attach an account until the signed-in user approves",
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

const flow = readFileSync(join(process.cwd(), "components/globe/pc-connect-flow.tsx"), "utf8");
assert.ok(flow.includes("data-pc-connect-phase"));
assert.ok(flow.includes("consent: true"));
assert.ok(!flow.includes('setStep("done")'));
assert.ok(!flow.includes("Rimvio PC Agent"));

const desktopMain = readFileSync(
  join(process.cwd(), "apps/local-agent/src/desktop-main.ts"),
  "utf8",
);
assert.ok(desktopMain.includes("Heartbeat started"));
assert.ok(!desktopMain.includes("playwright"));
assert.ok(!desktopMain.includes("createExecutionEngine"));

const desktop = readFileSync(join(process.cwd(), "apps/pc-desktop/package.json"), "utf8");
assert.ok(desktop.includes("Rimvio-Setup.exe"));
assert.ok(desktop.includes("runAfterFinish"));

const setupUrl = readFileSync(join(process.cwd(), "lib/pc-local-agent/setup-url.ts"), "utf8");
assert.ok(setupUrl.includes("releases/latest/download/Rimvio-Setup.exe"));
assert.ok(setupUrl.includes("RIMVIO_PC_SETUP_URL"));

console.log("pc-onboarding-phase ok");
