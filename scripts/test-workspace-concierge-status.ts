/**
 * Workspace concierge status — rain/quiet cues without analytics wall.
 * Run: npx tsx scripts/test-workspace-concierge-status.ts
 */

import assert from "node:assert/strict";
import { buildWorkspaceConciergeStatus } from "@/lib/context-workspace/build-workspace-concierge-status";

{
  const s = buildWorkspaceConciergeStatus({
    anchorTitle: "난바 파크스",
    tempC: 22,
    prepLine: "흐림 · 우산 준비",
    routeStopCount: 4,
  });
  assert.ok(s.topWeatherKo?.includes("22"));
  assert.ok(s.bottomLiveKo?.includes("난바 파크스"));
  assert.equal(s.suggestRainRevise, true);
}

{
  const s = buildWorkspaceConciergeStatus({
    anchorTitle: "에비스 다리",
    tempC: 24,
    prepLine: "맑음",
    routeStopCount: 4,
  });
  assert.equal(s.suggestRainRevise, false);
  assert.equal(s.suggestQuietRoute, true);
  assert.ok(s.bottomLiveKo?.includes("쾌적"));
}

console.log("OK — workspace-concierge-status");
