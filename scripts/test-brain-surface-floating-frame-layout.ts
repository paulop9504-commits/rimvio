import assert from "node:assert/strict";
import {
  GLOBE_INFO_FRAME_BOTTOM_INSET_PX,
  GLOBE_INFO_FRAME_PRESETS,
  clampGlobeInfoFramePosition,
  clampGlobeInfoFrameWidth,
  normalizeGlobeInfoFrameLayout,
  resolveDefaultGlobeInfoFrameLayout,
} from "../lib/globe/brain-surface-floating-frame-layout";

const viewport = { width: 390, height: 844 };

for (const frameId of Object.keys(GLOBE_INFO_FRAME_PRESETS) as Array<
  keyof typeof GLOBE_INFO_FRAME_PRESETS
>) {
  const layout = resolveDefaultGlobeInfoFrameLayout(frameId, viewport);
  assert.ok(layout.width >= GLOBE_INFO_FRAME_PRESETS[frameId].minWidth);
  assert.ok(layout.height >= GLOBE_INFO_FRAME_PRESETS[frameId].minHeight);
}

const videoDefault = resolveDefaultGlobeInfoFrameLayout("brain-surface-video", viewport);
assert.equal(
  videoDefault.width,
  GLOBE_INFO_FRAME_PRESETS["brain-surface-video"].defaultWidth,
);

const infoDefault = resolveDefaultGlobeInfoFrameLayout("brain-surface-info", viewport);
assert.ok(
  infoDefault.top <=
    viewport.height - GLOBE_INFO_FRAME_BOTTOM_INSET_PX - 80,
);

const clamped = clampGlobeInfoFramePosition({
  left: 999,
  top: 999,
  width: 216,
  height: 180,
  viewport,
});
assert.ok(clamped.left < viewport.width - 216);

assert.equal(
  clampGlobeInfoFrameWidth(500, GLOBE_INFO_FRAME_PRESETS["brain-surface-preview"], 390),
  374,
);

const normalized = normalizeGlobeInfoFrameLayout(
  "brain-surface-detail",
  { left: 12, top: 400, width: 500, height: 600 },
  viewport,
);
assert.ok(normalized.width <= 440);
assert.ok(normalized.height <= 480);

console.log("test-brain-surface-floating-frame-layout: ok");
