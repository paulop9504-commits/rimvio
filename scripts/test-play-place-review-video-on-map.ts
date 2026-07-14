#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { playPlaceReviewVideoOnMap } from "../lib/globe/play-place-review-video-on-map";

assert.equal(
  playPlaceReviewVideoOnMap({
    video: {
      embedUrl: "https://www.youtube.com/embed/x",
      videoId: "x",
      title: "호텔",
      channelTitle: null,
      thumbnailUrl: null,
    },
    lat: null,
    lng: 135,
  }),
  false,
);

assert.equal(
  playPlaceReviewVideoOnMap({
    video: {
      embedUrl: "",
      videoId: "x",
      title: null,
      channelTitle: null,
      thumbnailUrl: null,
    },
    lat: 34,
    lng: 135,
  }),
  false,
);

console.log("test-play-place-review-video-on-map: ok");
