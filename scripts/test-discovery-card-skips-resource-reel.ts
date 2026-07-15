/**
 * discovery_card focus must highlight the map only — never open the left
 * resource reel (that clears HTML pins via mapMediaFocus).
 */
import assert from "node:assert/strict";
import { forwardEateryFocusToResourceReel } from "../lib/globe/resource-reel/globe-resource-reel-bridge";
import { forwardLodgingFocusToResourceReel } from "../lib/globe/resource-reel/globe-resource-reel-bridge";
import { GLOBE_RESOURCE_REEL_FOCUS } from "../lib/globe/resource-reel/globe-resource-reel-bridge";

const g = globalThis as typeof globalThis & {
  window?: Window & typeof globalThis;
};

class FakeWindow {
  listeners = new Map<string, Set<EventListener>>();
  addEventListener(type: string, listener: EventListener): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }
  dispatchEvent(event: Event): boolean {
    const type = event.type;
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
    return true;
  }
}

const fake = new FakeWindow();
g.window = fake as unknown as Window & typeof globalThis;

let reelFocusCount = 0;
fake.addEventListener(GLOBE_RESOURCE_REEL_FOCUS, () => {
  reelFocusCount += 1;
});

forwardEateryFocusToResourceReel({
  resourceId: "evt-1:activity:usj",
  carouselIndex: 0,
  source: "discovery_card",
});
assert.equal(reelFocusCount, 0, "eatery discovery_card must not open reel");

forwardLodgingFocusToResourceReel({
  resourceId: "evt-1:lodging:hotel-1",
  carouselIndex: 0,
  source: "discovery_card",
});
assert.equal(reelFocusCount, 0, "lodging discovery_card must not open reel");

forwardEateryFocusToResourceReel({
  resourceId: "evt-1:eatery:sushi-1",
  carouselIndex: 0,
  source: "map_marker",
});
assert.equal(reelFocusCount, 1, "map_marker eatery should open reel");

forwardLodgingFocusToResourceReel({
  resourceId: "evt-1:lodging:hotel-1",
  carouselIndex: 0,
  source: "map_marker",
});
assert.equal(reelFocusCount, 2, "map_marker lodging should open reel");

console.log("test-discovery-card-skips-resource-reel: ok");
