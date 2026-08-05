/**
 * Smoke: Floating Callout Windows — multi-window Interaction Model.
 * Reality Object untouched; UI state only.
 */
import assert from "node:assert/strict";
import {
  CALLOUT_WINDOW_MAX,
  CALLOUT_WINDOW_MODES,
  clearCalloutWindowsForTests,
  closeCalloutWindow,
  findCalloutWindowByEntity,
  focusCalloutWindow,
  getCalloutWindowsSnapshot,
  getFocusedCalloutWindowId,
  listActiveCalloutWindows,
  openCalloutWindow,
  openCalloutWindowsFromAgent,
  setCalloutWindowMode,
  updateCalloutWindowLayout,
} from "@/lib/callout/windows";

clearCalloutWindowsForTests();

assert.deepEqual(
  [...CALLOUT_WINDOW_MODES],
  ["compact", "floating", "workspace"],
);
assert.equal(CALLOUT_WINDOW_MAX, 3);

const a = openCalloutWindow({ entityId: "hotel_a" });
assert.equal(a.entityId, "hotel_a");
assert.equal(a.mode, "floating");
assert.equal(a.anchored, true);
assert.equal(a.locked, false);
assert.equal(listActiveCalloutWindows().length, 1);
assert.equal(getFocusedCalloutWindowId(), a.id);

const b = openCalloutWindow({ entityId: "hotel_b" });
assert.equal(listActiveCalloutWindows().length, 2);
assert.equal(getFocusedCalloutWindowId(), b.id);
assert.ok(b.zIndex > a.zIndex);

// Same entity → focus, no duplicate
const aAgain = openCalloutWindow({ entityId: "hotel_a" });
assert.equal(aAgain.id, a.id);
assert.equal(listActiveCalloutWindows().length, 2);
assert.equal(getFocusedCalloutWindowId(), a.id);
assert.ok(aAgain.zIndex > b.zIndex);

const focused = focusCalloutWindow(b.id);
assert.ok(focused);
assert.equal(getFocusedCalloutWindowId(), b.id);

updateCalloutWindowLayout(b.id, {
  position: { x: 120, y: 200 },
  size: { width: 340, height: 400 },
  anchored: false,
  scale: 1.2,
});
const moved = findCalloutWindowByEntity("hotel_b")!;
assert.equal(moved.anchored, false);
assert.equal(moved.position.x, 120);
assert.equal(moved.size.width, 340);
assert.equal(moved.scale, 1.2);

setCalloutWindowMode(b.id, "compact");
assert.equal(findCalloutWindowByEntity("hotel_b")!.mode, "compact");
setCalloutWindowMode(b.id, "floating");

openCalloutWindow({ entityId: "hotel_c" });
assert.equal(listActiveCalloutWindows().length, 3);

// Max 3 — open 4th evicts oldest unlocked (hotel_a was first)
openCalloutWindow({ entityId: "hotel_d" });
assert.equal(listActiveCalloutWindows().length, 3);
assert.equal(findCalloutWindowByEntity("hotel_a"), null);
assert.ok(findCalloutWindowByEntity("hotel_d"));

{
  const s1 = getCalloutWindowsSnapshot();
  const s2 = getCalloutWindowsSnapshot();
  assert.equal(s1, s2, "getCalloutWindowsSnapshot must be referentially stable");
}

const agentOpened = openCalloutWindowsFromAgent(["food_1", "food_2"]);
assert.ok(agentOpened.length >= 1);
assert.ok(listActiveCalloutWindows().length <= CALLOUT_WINDOW_MAX);

closeCalloutWindow(findCalloutWindowByEntity("hotel_d")!.id);
assert.equal(findCalloutWindowByEntity("hotel_d"), null);

clearCalloutWindowsForTests();
assert.equal(listActiveCalloutWindows().length, 0);

console.log(
  "ok callout-windows multi-focus-layout max3 eviction · Reality untouched",
);
