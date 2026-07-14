#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { isPlaceMapYoutubePlayback } from "../lib/globe/place-map-youtube-bridge";

assert.equal(
  isPlaceMapYoutubePlayback({
    embedUrl: "https://www.youtube.com/embed/abc",
    videoId: "abc",
    title: "Tantalus Lookout",
    lat: 21.33,
    lng: -157.82,
  }),
  true,
);

assert.equal(
  isPlaceMapYoutubePlayback({
    embedUrl: "",
    videoId: "abc",
    title: null,
    lat: 21.33,
    lng: -157.82,
  }),
  false,
);

assert.equal(
  isPlaceMapYoutubePlayback({
    embedUrl: "https://www.youtube.com/embed/abc",
    videoId: "abc",
    title: null,
    lat: Number.NaN,
    lng: -157.82,
  }),
  false,
);

console.log("test-place-map-youtube-bridge: ok");
