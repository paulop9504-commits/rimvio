#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

function assertSiblingCloseAfterSessionReady(input: {
  file: string;
  closeCall: string;
  sessionGuard: string;
  sessionDispatch: string;
  label: string;
}) {
  const source = readFileSync(join(root, input.file), "utf8");
  const guardIndex = source.indexOf(input.sessionGuard);
  const closeIndex = source.indexOf(input.closeCall);
  const dispatchIndex = source.indexOf(input.sessionDispatch);

  assert.ok(guardIndex >= 0, `${input.label}: missing session readiness guard`);
  assert.ok(closeIndex >= 0, `${input.label}: missing sibling close dispatch`);
  assert.ok(dispatchIndex >= 0, `${input.label}: missing session dispatch`);
  assert.ok(
    closeIndex > guardIndex,
    `${input.label}: sibling discovery must stay open until the new session is ready`,
  );
  assert.ok(
    closeIndex < dispatchIndex,
    `${input.label}: sibling discovery should close immediately before opening the replacement session`,
  );
}

assertSiblingCloseAfterSessionReady({
  file: "lib/globe/eatery/run-globe-eatery-discovery.ts",
  closeCall: "dispatchGlobeLodgingDiscoveryClose();",
  sessionGuard: "if (!session) {",
  sessionDispatch: "dispatchGlobeEateryDiscoverySession(session);",
  label: "eatery discovery",
});

assertSiblingCloseAfterSessionReady({
  file: "lib/globe/lodging/run-globe-lodging-discovery.ts",
  closeCall: "dispatchGlobeEateryDiscoveryClose();",
  sessionGuard: "if (!session) {",
  sessionDispatch: "dispatchGlobeLodgingDiscoverySession(session);",
  label: "lodging discovery",
});

console.log("test-globe-discovery-sibling-close: ok");
