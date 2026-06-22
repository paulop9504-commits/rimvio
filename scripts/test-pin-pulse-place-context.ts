#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveTrendBridgeLocationDong } from "../lib/globe/trend-bridge/server/trend-bridge-geo";

function main() {
  assert.equal(resolveTrendBridgeLocationDong("서울 송파 가락동"), "가락동");
  assert.equal(resolveTrendBridgeLocationDong("성수동"), "성수동");
  assert.equal(resolveTrendBridgeLocationDong(""), null);

  console.log("test-pin-pulse-place-context: ok");
}

main();
