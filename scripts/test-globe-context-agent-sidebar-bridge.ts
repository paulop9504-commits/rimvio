#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  armGlobeContextAgent,
  bindGlobeContextAgent,
  cancelGlobeContextAgentArm,
  clearGlobeContextAgent,
  readGlobeContextAgentSession,
} from "../lib/globe/context-agent/globe-context-agent-bridge";

function simulateSidebarCloseWhileArming() {
  clearGlobeContextAgent();
  armGlobeContextAgent();
  assert.equal(readGlobeContextAgentSession().phase, "arming");

  bindGlobeContextAgent("ev-trip-1");
  assert.equal(readGlobeContextAgentSession().phase, "bound");
  assert.equal(readGlobeContextAgentSession().boundEventId, "ev-trip-1");

  const phaseOnClose = readGlobeContextAgentSession().phase;
  if (phaseOnClose === "arming") {
    cancelGlobeContextAgentArm();
  }
  assert.equal(readGlobeContextAgentSession().phase, "bound");
  assert.equal(readGlobeContextAgentSession().boundEventId, "ev-trip-1");
}

function simulateCloseWithoutPickCancelsArm() {
  clearGlobeContextAgent();
  armGlobeContextAgent();
  assert.equal(readGlobeContextAgentSession().phase, "arming");

  if (readGlobeContextAgentSession().phase === "arming") {
    cancelGlobeContextAgentArm();
  }
  assert.equal(readGlobeContextAgentSession().phase, "idle");
  assert.equal(readGlobeContextAgentSession().boundEventId, null);
}

simulateSidebarCloseWhileArming();
simulateCloseWithoutPickCancelsArm();

console.log("test-globe-context-agent-sidebar-bridge: ok");
