#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  clearSelectiveSegmentationCache,
  decideSegmentation,
  readSelectiveSegmentationCacheSize,
  resolveCutoutPresentationMode,
  runSelectiveSegmentation,
  selectProjectionVisualWithSegmentation,
} from "../lib/visual-projection";

clearSelectiveSegmentationCache();

// Food YES → soft_blob cutout
const food = runSelectiveSegmentation({
  objectType: "restaurant",
  imageUrl: "https://cdn.example.com/ramen-food-bowl.jpg",
  recognitionScore: 96,
  skipCache: true,
});
assert.equal(food.useSegmentation, true);
assert.equal(food.applied, true);
assert.equal(food.pipeline, "css_cutout");
assert.equal(food.cutoutMode, "soft_blob");
assert.equal(food.displayUrl, food.sourceUrl);

// Nightscape NO → keep original
const night = runSelectiveSegmentation({
  objectType: "landmark",
  imageUrl: "https://cdn.example.com/osaka-night-cityscape.jpg",
  caption: "야경",
  recognitionScore: 95,
  skipCache: true,
});
assert.equal(night.useSegmentation, false);
assert.equal(night.applied, false);
assert.equal(night.pipeline, "keep_original");
assert.equal(night.cutoutMode, "none");

// Beach NO
const beach = runSelectiveSegmentation({
  objectType: "activity",
  imageUrl: "https://cdn.example.com/beach-scenery.jpg",
  recognitionScore: 95,
  skipCache: true,
});
assert.equal(beach.useSegmentation, false);
assert.equal(beach.cutoutMode, "none");

// Hotel room YES → soft_pill
const room = runSelectiveSegmentation({
  objectType: "hotel",
  imageUrl: "https://cdn.example.com/hotel-room-suite.jpg",
  recognitionScore: 94,
  skipCache: true,
});
assert.equal(room.useSegmentation, true);
assert.equal(room.cutoutMode, "soft_pill");

// Low recognition → no cutout
const low = runSelectiveSegmentation({
  objectType: "restaurant",
  imageUrl: "https://cdn.example.com/ramen-food-bowl.jpg",
  recognitionScore: 40,
  skipCache: true,
});
assert.equal(low.useSegmentation, false);
assert.equal(low.decision.reason, "low_recognition");

assert.equal(
  resolveCutoutPresentationMode({ useSegmentation: false, subject: "food" }),
  "none",
);
assert.equal(
  resolveCutoutPresentationMode({ useSegmentation: true, subject: "food" }),
  "soft_blob",
);

// Combined select + pipeline
const picked = selectProjectionVisualWithSegmentation({
  objectType: "restaurant",
  candidates: [
    { url: "https://cdn.example.com/storefront-sign.jpg" },
    { url: "https://cdn.example.com/ramen-food-dish.jpg" },
  ],
});
assert.ok(picked);
assert.match(picked!.selection.url, /food/);
assert.equal(picked!.segmentation.useSegmentation, true);
assert.equal(picked!.segmentation.cutoutMode, "soft_blob");

// Cache
clearSelectiveSegmentationCache();
assert.equal(readSelectiveSegmentationCacheSize(), 0);
runSelectiveSegmentation({
  objectType: "restaurant",
  imageUrl: "https://cdn.example.com/ramen-food-bowl.jpg",
  recognitionScore: 96,
});
assert.equal(readSelectiveSegmentationCacheSize(), 1);
runSelectiveSegmentation({
  objectType: "restaurant",
  imageUrl: "https://cdn.example.com/ramen-food-bowl.jpg",
  recognitionScore: 96,
});
assert.equal(readSelectiveSegmentationCacheSize(), 1);

// Gate SSOT still matches
const gate = decideSegmentation({
  objectType: "restaurant",
  imageUrl: "https://cdn.example.com/ramen-food-bowl.jpg",
  recognitionScore: 96,
});
assert.equal(gate.useSegmentation, food.useSegmentation);

console.log("test-selective-segmentation: ok");
