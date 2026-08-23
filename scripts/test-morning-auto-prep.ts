import assert from "node:assert/strict";
import { wireKillerLoops, FIXTURE_MORNING_WIRING } from "../lib/loop-wiring";
import {
  resolveMorningAutoPrepSurface,
  shouldRenderLatentLayersWithMorningAutoPrep,
} from "../lib/morning-loop/resolve-morning-auto-prep";

{
  const frame = wireKillerLoops(FIXTURE_MORNING_WIRING);
  assert.equal(frame.activeLoop?.loopType, "MORNING_LOOP");
}

{
  const visible = resolveMorningAutoPrepSurface({
    dominantLoop: "MORNING_LOOP",
    firstUnlockToday: true,
    prepSurfaceVisible: true,
    dismissedForDateKey: null,
    dateKey: "2026-08-23",
  });
  assert.equal(visible.visible, true);
  assert.equal(visible.reason, "morning_unlock");
  assert.equal(visible.showPrepRows, true);
}

{
  const hidden = resolveMorningAutoPrepSurface({
    dominantLoop: "MORNING_LOOP",
    firstUnlockToday: false,
    prepSurfaceVisible: true,
    dismissedForDateKey: null,
    dateKey: "2026-08-23",
  });
  assert.equal(hidden.visible, false);
  assert.equal(hidden.reason, "not_first_unlock");
}

{
  const dismissed = resolveMorningAutoPrepSurface({
    dominantLoop: "MORNING_LOOP",
    firstUnlockToday: true,
    prepSurfaceVisible: true,
    dismissedForDateKey: "2026-08-23",
    dateKey: "2026-08-23",
  });
  assert.equal(dismissed.visible, false);
  assert.equal(dismissed.reason, "dismissed");
}

{
  const latent = shouldRenderLatentLayersWithMorningAutoPrep({
    frame: {
      layout: {
        primary: {
          id: "surface-schedule-1",
          visibility: "visible",
        },
      },
    },
    morningAutoPrepVisible: true,
  });
  assert.equal(latent, true);
}

console.log("test-morning-auto-prep: ok");
