#!/usr/bin/env npx tsx
/**
 * Guest-first presence — session/device active counts (memory path).
 */

import assert from "node:assert/strict";
import {
  countPresenceRows,
  fetchActivePresenceCounts,
  normalizePresenceIds,
  resetPresenceMemoryForTests,
  upsertPresenceHeartbeat,
} from "../lib/analytics";

async function main() {
  assert.equal(normalizePresenceIds({ deviceId: "a", sessionId: "b" }), null);
  assert.ok(
    normalizePresenceIds({
      deviceId: "device-aaaa-bbbb",
      sessionId: "session-cccc-dddd",
    }),
  );

  {
    const counts = countPresenceRows([
      { device_id: "d1", session_id: "s1", working: true },
      { device_id: "d2", session_id: "s1", working: false },
      { device_id: "d3", session_id: "s2", working: true },
    ]);
    assert.equal(counts.activeDevices, 3);
    assert.equal(counts.activeSessions, 2);
    assert.equal(counts.workingDevices, 2);
  }

  resetPresenceMemoryForTests();
  await upsertPresenceHeartbeat(null, {
    deviceId: "device-1111-2222",
    sessionId: "session-aaaa-bbbb",
    surface: "globe",
    working: true,
  });
  await upsertPresenceHeartbeat(null, {
    deviceId: "device-3333-4444",
    sessionId: "session-cccc-dddd",
    surface: "peers",
    working: false,
  });
  // Same device, new session — still one device.
  await upsertPresenceHeartbeat(null, {
    deviceId: "device-1111-2222",
    sessionId: "session-eeee-ffff",
    surface: "globe",
    working: true,
  });

  const active = await fetchActivePresenceCounts(null);
  assert.equal(active.activeDevices, 2);
  assert.equal(active.activeSessions, 2);
  assert.equal(active.workingDevices, 1);

  console.log("test-analytics-presence: ok", active);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
