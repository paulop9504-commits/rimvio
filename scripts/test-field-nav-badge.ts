import assert from "node:assert/strict";
import {
  resolveFieldNavBadgeCount,
  resolveFieldNavSuggestedTab,
} from "@/lib/nav/resolve-field-nav-badge";

assert.equal(resolveFieldNavBadgeCount(0), 0);
assert.equal(resolveFieldNavBadgeCount(-1), 0);
assert.equal(resolveFieldNavBadgeCount(1), 1);
assert.equal(resolveFieldNavBadgeCount(3.7), 3);
assert.equal(resolveFieldNavBadgeCount(12), 12);

assert.equal(
  resolveFieldNavSuggestedTab({
    queueCount: 1,
    tradeCount: 5,
    mineCount: 2,
  }),
  "queue",
);
assert.equal(
  resolveFieldNavSuggestedTab({
    queueCount: 0,
    tradeCount: 2,
    mineCount: 1,
  }),
  "trades",
);
assert.equal(
  resolveFieldNavSuggestedTab({
    queueCount: 0,
    tradeCount: 0,
    mineCount: 1,
  }),
  "mine",
);
assert.equal(
  resolveFieldNavSuggestedTab({
    queueCount: 0,
    tradeCount: 0,
    mineCount: 0,
  }),
  "queue",
);

console.log("test-field-nav-badge: ok");
