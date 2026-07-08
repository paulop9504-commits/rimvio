#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  armGlobeContextAgent,
  clearGlobeContextAgent,
  readGlobeContextAgentSession,
} from "../lib/globe/context-agent/globe-context-agent-bridge";

/**
 * Regression: arming must not be treated like idle cleanup.
 * Globe home previously cleared the session whenever eventId was null and
 * phase !== "bound", which cancelled arming immediately.
 */
function simulateTouchedContextCleanup(phase: "idle" | "arming" | "bound", eventId: string | null) {
  if (!eventId && phase === "idle") {
    clearGlobeContextAgent();
  }
}

clearGlobeContextAgent();
armGlobeContextAgent();
assert.equal(readGlobeContextAgentSession().phase, "arming");

simulateTouchedContextCleanup("arming", null);
assert.equal(readGlobeContextAgentSession().phase, "arming");

clearGlobeContextAgent();
simulateTouchedContextCleanup("idle", null);
assert.equal(readGlobeContextAgentSession().phase, "idle");

console.log("test-globe-context-agent-arming-persist: ok");
