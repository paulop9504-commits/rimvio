#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { shouldUseDiscoveryVideoHero } from "../lib/globe/intelligent-pin/should-use-discovery-video-hero";

assert.equal(
  shouldUseDiscoveryVideoHero({
    imageUrls: [],
    hasVideoContext: true,
  }),
  true,
);

assert.equal(
  shouldUseDiscoveryVideoHero({
    imageUrls: ["  "],
    hasVideoContext: true,
  }),
  true,
);

assert.equal(
  shouldUseDiscoveryVideoHero({
    imageUrls: ["https://example.com/a.jpg"],
    hasVideoContext: true,
  }),
  false,
);

assert.equal(
  shouldUseDiscoveryVideoHero({
    imageUrls: [],
    hasVideoContext: false,
  }),
  false,
);

console.log("test-discovery-video-hero: ok");
