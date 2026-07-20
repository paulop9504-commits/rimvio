#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { playPlaceReviewVideoOnMap } from "../lib/globe/play-place-review-video-on-map";
import {
  PLACE_MAP_YOUTUBE_OPEN,
  type PlaceMapYoutubePlayback,
} from "../lib/globe/place-map-youtube-bridge";

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

{
  let captured: PlaceMapYoutubePlayback | null = null;
  const handler = (event: Event) => {
    captured = (event as CustomEvent<PlaceMapYoutubePlayback>).detail;
  };
  Object.assign(globalThis, {
    window: {
      dispatchEvent: (event: Event) => {
        handler(event);
        return true;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });

  const ok = playPlaceReviewVideoOnMap({
    video: {
      embedUrl: "https://www.youtube.com/embed/osaka-vlog",
      videoId: "osaka-vlog",
      title: "오사카 2박3일",
      channelTitle: null,
      thumbnailUrl: null,
    },
    // Wrong GPS (Seoul) — must still open at Osaka from title.
    lat: 37.5665,
    lng: 126.978,
    placeLabel: "오사카",
  });
  assert.equal(ok, true);
  assert.ok(captured);
  assert.ok(Math.abs(captured!.lat - 34.6937) < 0.5);
  assert.ok(Math.abs(captured!.lng - 135.5023) < 0.5);
  void PLACE_MAP_YOUTUBE_OPEN;
}

console.log("test-play-place-review-video-on-map: ok");
