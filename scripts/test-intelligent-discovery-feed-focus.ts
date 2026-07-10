import assert from "node:assert/strict";
import {
  dispatchIntelligentDiscoveryFeedClose,
  dispatchIntelligentDiscoveryFeedOpen,
  subscribeIntelligentDiscoveryFeedClose,
  subscribeIntelligentDiscoveryFeedOpen,
} from "../lib/globe/intelligent-pin/intelligent-pin-bridge";

const eventId = "evt-feed-focus-test";

if (!("window" in globalThis)) {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  Object.assign(globalThis, {
    window: {
      dispatchEvent(event: Event) {
        const handlers = listeners.get(event.type);
        handlers?.forEach((handler) => handler(event));
        return true;
      },
      addEventListener(type: string, handler: (event: Event) => void) {
        const bucket = listeners.get(type) ?? new Set();
        bucket.add(handler);
        listeners.set(type, bucket);
      },
      removeEventListener(type: string, handler: (event: Event) => void) {
        listeners.get(type)?.delete(handler);
      },
    },
    CustomEvent: class CustomEvent<T> extends Event {
      detail: T;
      constructor(type: string, init?: { detail?: T }) {
        super(type);
        this.detail = init?.detail as T;
      }
    },
  });
}

let focus = false;
const unsubOpen = subscribeIntelligentDiscoveryFeedOpen((detail) => {
  focus = detail.contextEventId === eventId;
});
const unsubClose = subscribeIntelligentDiscoveryFeedClose((detail) => {
  if (detail.contextEventId === eventId) {
    focus = false;
  }
});

dispatchIntelligentDiscoveryFeedOpen({
  contextEventId: eventId,
  source: "scout_complete",
});
assert.equal(focus, true);

dispatchIntelligentDiscoveryFeedClose(eventId);
assert.equal(focus, false);

unsubOpen();
unsubClose();

console.log("test-intelligent-discovery-feed-focus: ok");
