import assert from "node:assert/strict";
import {
  isDeepLocalNight,
  refreshLivePlaceReasonKo,
  resolveLiveOpenNowLabel,
} from "@/lib/globe/feed-entity/refresh-live-place-feed-copy";
import { copy } from "@/lib/copy/human-ko";

const staleReason =
  "지금 영업 중, 9분 거리 · 오후 7:10 도착 예상";
const dawn = new Date("2026-07-11T04:03:00+09:00");

assert.equal(isDeepLocalNight(dawn), true);
assert.equal(
  resolveLiveOpenNowLabel(true, dawn),
  copy.globe.feedEntityHoursCheck,
);

const refreshed = refreshLivePlaceReasonKo({
  reasonKo: staleReason,
  openNow: true,
  now: dawn,
});
assert.match(refreshed, /영업 시간 확인/u);
assert.doesNotMatch(refreshed, /오후 7:10/u);
assert.match(refreshed, /9분 거리 · .+ 4:12/u);

console.log("test-live-place-feed-copy ok");
