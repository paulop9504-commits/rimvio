import assert from "node:assert/strict";
import {
  bindGlobeContextAgent,
  clearGlobeContextAgent,
} from "../lib/globe/context-agent/globe-context-agent-bridge";
import {
  isGlobeContextAgentFocusLocked,
  isGlobeContextSwitchBlocked,
  shouldAutoLaunchBrainSurface,
  shouldOpenGlobeBridgeSheet,
} from "../lib/globe/globe-focus-surface-policy";

clearGlobeContextAgent();
assert.equal(isGlobeContextAgentFocusLocked(), false);
assert.equal(shouldOpenGlobeBridgeSheet(), true);
assert.equal(shouldAutoLaunchBrainSurface(), true);
assert.equal(isGlobeContextSwitchBlocked("ev-other"), false);

bindGlobeContextAgent("ev-osaka");
assert.equal(isGlobeContextAgentFocusLocked(), true);
assert.equal(shouldOpenGlobeBridgeSheet(), false);
assert.equal(shouldAutoLaunchBrainSurface(), false);
assert.equal(isGlobeContextSwitchBlocked("ev-osaka"), false);
assert.equal(isGlobeContextSwitchBlocked("ev-tokyo"), true);

clearGlobeContextAgent();
assert.equal(isGlobeContextAgentFocusLocked(), false);

console.log("test-globe-focus-surface-policy: ok");
