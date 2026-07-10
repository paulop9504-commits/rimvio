import assert from "node:assert/strict";
import { resolveLodgingDiscoveryPov } from "../lib/globe/discovery-lens/resolve-lodging-discovery-pov";
import {
  resolveSpatialTargetFromText,
  writeContextSpatialTargetFromText,
} from "../lib/globe/spatial";

const seomyeon = resolveSpatialTargetFromText(
  "지금 출장중인데 부산 서면쪽 숙소 예약 준비해",
);
assert.ok(seomyeon);
assert.match(seomyeon!.label, /서면/u);
assert.ok(Math.abs(seomyeon!.lat - 35.1579) < 0.02);
assert.ok(Math.abs(seomyeon!.lng - 129.059) < 0.02);

const sideCue = resolveSpatialTargetFromText("서면쪽");
assert.ok(sideCue);
assert.match(sideCue!.label, /서면/u);

console.log("test-spatial-geocode-pov: resolve ok (write path requires browser SSOT)");
