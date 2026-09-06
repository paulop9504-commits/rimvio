#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { executeHarnessInBrowser } from "@/lib/harness/execute-browser";
import { createSandboxLabellingDraft, appendLabellingAction, updateLabellingOverview } from "@/lib/harness/labelling";

async function main() {
  const desktop = createSandboxLabellingDraft({
    name: "Local Only",
    surface: "local",
    now: "2026-09-06T09:00:00.000Z",
  });
  const desktopResult = await executeHarnessInBrowser({ harness: desktop });
  assert.equal(desktopResult.ok, false);
  assert.equal(desktopResult.error, "UNSUPPORTED_RUNTIME");

  let web = createSandboxLabellingDraft({
    name: "Web Nav",
    surface: "web",
    now: "2026-09-06T09:00:00.000Z",
  });
  web = updateLabellingOverview(web, {
    name: "Web Nav",
    targetHost: "example.com",
  });
  web = appendLabellingAction(web, {
    type: "NAVIGATE",
    target: { url: "https://example.com" },
  });
  web = appendLabellingAction(web, {
    type: "WAIT",
    waitFor: { type: "TIMEOUT", ms: 50 },
  });

  const webResult = await executeHarnessInBrowser({
    harness: web,
    requireReal: false,
  });
  assert.equal(webResult.ok, true, webResult.error ?? "expected ok");
  assert.ok(webResult.state.logs.some((l) => l.status === "SUCCESS"));
  assert.ok(webResult.runtimeKind === "playwright" || webResult.runtimeKind === "simulated");

  console.log("test-harness-execute: PASS", { runtimeKind: webResult.runtimeKind });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
