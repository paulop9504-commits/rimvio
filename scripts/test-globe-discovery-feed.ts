import assert from "node:assert/strict";
import {
  GLOBE_DISCOVERY_FETCH_LIMIT,
  GLOBE_DISCOVERY_INITIAL_REVEAL_COUNT,
  GLOBE_DISCOVERY_REVEAL_STEP,
  getInitialGlobeDiscoveryRevealCount,
  getNextGlobeDiscoveryRevealCount,
  hasMoreGlobeDiscoveryItems,
  resolveGlobeDiscoveryFeedStatus,
} from "@/lib/globe/discovery/globe-discovery-feed";

function run() {
  assert.equal(GLOBE_DISCOVERY_FETCH_LIMIT, 18);
  assert.equal(GLOBE_DISCOVERY_INITIAL_REVEAL_COUNT, 4);
  assert.equal(GLOBE_DISCOVERY_REVEAL_STEP, 4);
  assert.ok(GLOBE_DISCOVERY_FETCH_LIMIT > GLOBE_DISCOVERY_INITIAL_REVEAL_COUNT);

  assert.equal(getInitialGlobeDiscoveryRevealCount(0), 0);
  assert.equal(getInitialGlobeDiscoveryRevealCount(2), 2);
  assert.equal(getInitialGlobeDiscoveryRevealCount(12), 4);

  assert.equal(getNextGlobeDiscoveryRevealCount(0, 12), 4);
  assert.equal(getNextGlobeDiscoveryRevealCount(4, 12), 8);
  assert.equal(getNextGlobeDiscoveryRevealCount(8, 12), 12);
  assert.equal(getNextGlobeDiscoveryRevealCount(12, 12), 12);

  assert.equal(hasMoreGlobeDiscoveryItems(4, 12), true);
  assert.equal(hasMoreGlobeDiscoveryItems(12, 12), false);

  assert.equal(
    resolveGlobeDiscoveryFeedStatus({
      visibleCount: 4,
      totalCount: 12,
      loadingMore: false,
    }),
    "more",
  );
  assert.equal(
    resolveGlobeDiscoveryFeedStatus({
      visibleCount: 4,
      totalCount: 12,
      loadingMore: true,
    }),
    "loading_more",
  );
  assert.equal(
    resolveGlobeDiscoveryFeedStatus({
      visibleCount: 12,
      totalCount: 12,
      loadingMore: false,
    }),
    "complete",
  );

  console.log("test-globe-discovery-feed: ok");
}

run();
