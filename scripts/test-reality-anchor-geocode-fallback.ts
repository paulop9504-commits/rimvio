/**
 * Smoke: unknown station name → Reality Anchor (metro / geocode) → coords.
 */
import assert from "node:assert/strict";
import {
  extractNearPlaceLabelFromUtterance,
  resolveRealityAnchorFromUtterance,
  resolveRealityAnchorFromUtteranceAsync,
} from "@/lib/context-workspace/reality-anchor";
import { resolveOsakaMetroStationFromText } from "@/lib/geo/osaka-metro/station-catalog";
import { parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch";

assert.equal(
  extractNearPlaceLabelFromUtterance("모리노미아역 근처 호텔좀 찾아줘"),
  "모리노미아역",
);

const patch = parseWorkspacePatch("모리노미아역 근처 호텔좀 찾아줘");
assert.ok(patch);
assert.equal(patch!.kind, "spatial_constraint");
if (patch!.kind === "spatial_constraint") {
  assert.equal(patch.nearLabelKo, "모리노미아역");
}

const metro = resolveOsakaMetroStationFromText("모리노미아역");
assert.ok(metro, "Osaka metro catalog should resolve 모리노미아→모리노미야");
assert.ok(Math.abs(metro!.lat - 34.68139) < 0.01);
assert.ok(Math.abs(metro!.lng - 135.53417) < 0.01);

const sync = resolveRealityAnchorFromUtterance("모리노미아역 근처 호텔");
assert.ok(sync);
assert.equal(sync!.kind, "station");
assert.equal(sync!.provider, "osaka_metro");

void (async () => {
  const asyncHit = await resolveRealityAnchorFromUtteranceAsync(
    "모리노미아역 근처 호텔좀 찾아줘",
  );
  assert.ok(asyncHit);
  assert.ok(Number.isFinite(asyncHit!.lat));
  assert.ok(Number.isFinite(asyncHit!.lng));
  // Morinomiya is east of Namba (~135.50) — must not be Namba seed
  assert.ok(asyncHit!.lng > 135.52, `expected Morinomiya lng, got ${asyncHit!.lng}`);
  console.log(
    `ok — reality-anchor resolve · ${asyncHit!.labelKo} · ${asyncHit!.provider} · ${asyncHit!.lat.toFixed(4)},${asyncHit!.lng.toFixed(4)}`,
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
