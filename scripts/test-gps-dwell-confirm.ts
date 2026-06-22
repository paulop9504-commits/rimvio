import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { appendFeedCaptureFragment } from "@/lib/feed/feed-capture-metadata";
import {
  formatDwellTimeRange,
  resolveDwellFragmentEndIso,
} from "@/lib/globe/gps-dwell/format-dwell-time-range";
import { projectGpsDwellConfirmDraft } from "@/lib/globe/gps-dwell/project-gps-dwell-confirm-segments";
import { resolveDwellSegmentPlace } from "@/lib/globe/gps-dwell/resolve-dwell-segment-place";

function localIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

const start = localIso(2026, 6, 23, 14, 20);
const end = localIso(2026, 6, 23, 15, 3);
assert.equal(formatDwellTimeRange(start, end), "6월 23일 14:20 – 15:03");

const crossStart = localIso(2026, 6, 22, 23, 10);
const crossEnd = localIso(2026, 6, 23, 1, 5);
assert.match(formatDwellTimeRange(crossStart, crossEnd), /6월 22일 23:10 – 6월 23일 1:05/);

assert.equal(
  resolveDwellFragmentEndIso({
    startIso: start,
    endedAtIso: end,
    dwellMinutes: 43,
  }),
  end,
);

const event: EventCandidate = {
  id: "event:test-dwell",
  title: "에버랜드 · 43분 체류",
  category: "travel",
  source: "system",
  lifecycle: "active",
  datetime: start,
  place: "에버랜드",
  confidence: 0.7,
  metadata: {
    targetingSource: "gps_background",
    feedCapturePendingVerify: true,
    ...appendFeedCaptureFragment(undefined, {
      id: "gps-dwell:1:37294:127202",
      kind: "gps_dwell",
      capturedAtIso: start,
      endedAtIso: end,
      lat: 37.294,
      lng: 127.202,
      placeLabel: "에버랜드",
      dwellMinutes: 43,
      autoAttached: true,
    }),
  },
  lifecycleUpdatedAt: start,
  createdAt: start,
  updatedAt: start,
};

const draft = projectGpsDwellConfirmDraft(event);
assert.ok(draft);
assert.equal(draft!.segments.length, 1);
assert.equal(draft!.segments[0]!.timeRangeLabel, "6월 23일 14:20 – 15:03");
const fragment = draft!.segments[0]!;
assert.equal(fragment.resolvedPlaceLabel, "에버랜드");

const place = resolveDwellSegmentPlace(
  {
    id: fragment.fragmentId,
    kind: "gps_dwell",
    capturedAtIso: fragment.startIso,
    endedAtIso: fragment.endIso,
    lat: fragment.lat,
    lng: fragment.lng,
    placeLabel: "에버랜드",
    dwellMinutes: fragment.dwellMinutes,
  },
  "에버랜드",
);
assert.equal(place.resolvedLabel, "에버랜드");

console.log("test-gps-dwell-confirm: ok");
