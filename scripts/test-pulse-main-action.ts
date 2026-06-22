#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolvePulseMainAction } from "../lib/globe/trend-bridge/resolve-pulse-main-action";

const copy = {
  headlineAlign: (place: string) => `${place} align`,
  headlineNow: (place: string) => `${place} now`,
  headlineAvoid: (place: string) => `${place} avoid`,
  bodyTaste: (name: string, place: string, peak: string) =>
    `${name} ${place} ${peak}`,
  bodyNow: (place: string, peak: string) => `${place} ${peak}`,
  bodyPattern: (place: string, peak: string) => `${place} pattern ${peak}`,
  bodyAvoid: (place: string, quiet: string, peak: string) =>
    `${place} quiet ${quiet} peak ${peak}`,
  ctaNavigate: "Navigate",
  ctaSchedule: "Schedule",
  ctaNavigateAnyway: "Go anyway",
};

const memory = {
  eventId: "ev-1",
  placeLabel: "성수동",
  lat: 37.544,
  lng: 127.055,
  captureAtIso: "2026-06-20T15:20:00+09:00",
};

const pulse = {
  locationDong: "성수동",
  contributorCount: 8,
  peakHour: "15:00 - 16:00",
  contextSummary: "주말 오후 활기",
  trendVelocity: "high" as const,
  userWeeklyContributions: 1,
  tasteMatch: true,
};

function main() {
  const align = resolvePulseMainAction({
    honorific: "성용님",
    mode: "align",
    memory,
    pulse,
    copy,
    now: new Date("2026-06-21T15:10:00+09:00"),
  });

  assert.ok(align);
  assert.equal(align!.placeLabel, "성수동");
  assert.ok(align!.navigateHref.includes("kakaomap://route"));
  assert.equal(align!.primaryKind, "navigate");
  assert.equal(align!.sourceRef, "pulse:memory_align");
  assert.ok(align!.scheduleHref?.includes("calendar.google.com"));

  const avoid = resolvePulseMainAction({
    honorific: "성용님",
    mode: "avoid",
    memory,
    pulse,
    copy,
    now: new Date("2026-06-21T15:10:00+09:00"),
  });

  assert.ok(avoid);
  assert.equal(avoid!.primaryKind, "schedule");
  assert.equal(avoid!.secondaryKind, "navigate");
  assert.equal(avoid!.sourceRef, "pulse:memory_avoid");
  assert.ok(avoid!.quietHour);

  const miss = resolvePulseMainAction({
    honorific: "당신",
    mode: "align",
    memory: {
      eventId: "ev-2",
      placeLabel: "판교",
      lat: 37.39,
      lng: 127.11,
      captureAtIso: "2026-01-10T09:00:00+09:00",
    },
    pulse: {
      locationDong: "판교",
      contributorCount: 6,
      peakHour: "20:00 - 21:00",
      contextSummary: "저녁",
      trendVelocity: "medium",
      userWeeklyContributions: 0,
      tasteMatch: false,
    },
    copy,
    now: new Date("2026-06-21T10:00:00+09:00"),
  });
  assert.equal(miss, null);

  const avoidMiss = resolvePulseMainAction({
    honorific: "당신",
    mode: "avoid",
    memory,
    pulse: { ...pulse, trendVelocity: "low", contributorCount: 2 },
    copy,
    now: new Date("2026-06-21T10:00:00+09:00"),
  });
  assert.equal(avoidMiss, null);

  console.log("test-pulse-main-action: ok");
}

main();
