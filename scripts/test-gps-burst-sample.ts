import assert from "node:assert/strict";
import {
  GPS_BURST_ACTIVE_DEDUPE_MS,
  GPS_BURST_PASSIVE_MIN_GAP_MS,
} from "../lib/location-ping/constants";
import {
  requestGpsBurst,
  resetGpsBurstSampleForTests,
} from "../lib/location-ping/gps-burst-sample";

async function run() {
  resetGpsBurstSampleForTests();

  assert.equal(GPS_BURST_PASSIVE_MIN_GAP_MS, 5 * 60 * 1000);
  assert.equal(GPS_BURST_ACTIVE_DEDUPE_MS, 15_000);

  const ping = await requestGpsBurst({ reason: "periodic", tier: "passive" });
  assert.equal(ping, null);

  console.log("test-gps-burst-sample: ok");
}

void run();
