#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  aggregateTrendCaptureDensity,
  aggregateTrendForLocationCategory,
  filterTrendCaptureOutliers,
  formatTrendContextMessage,
  normalizeCaptureTimeAnchor,
  runTrendCaptureAnalysisPipeline,
} from "../lib/globe/trend-bridge/analysis";

function actor(id: number): string {
  return `actor-${id}`;
}

function weekendCafeCapture(input: {
  actorId: number;
  hour: number;
  minute?: number;
}): {
  actorHash: string;
  location: string;
  category: string;
  timestamp: string;
} {
  const minute = input.minute ?? 0;
  return {
    actorHash: actor(input.actorId),
    location: "성수동",
    category: "카페",
    timestamp: `2026-06-20T${String(input.hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`,
  };
}

function main() {
  const anchor = normalizeCaptureTimeAnchor({
    timestamp: "2026-06-20T15:42:00+09:00",
  });
  assert.ok(anchor);
  assert.equal(anchor!.hourStart, 15);
  assert.equal(anchor!.bucketLabel, "15:00 - 16:00");
  assert.equal(anchor!.daySegment, "weekend");
  assert.equal(anchor!.dayOfWeek, 6);

  const weekdayAnchor = normalizeCaptureTimeAnchor({
    timestamp: "2026-06-17T09:30:00+09:00",
  });
  assert.equal(weekdayAnchor!.daySegment, "weekday");
  assert.equal(weekdayAnchor!.dayOfWeek, 3);

  const botFlood = Array.from({ length: 20 }, (_, index) =>
    weekendCafeCapture({ actorId: 99, hour: 15, minute: index }),
  );
  const filteredBot = filterTrendCaptureOutliers(botFlood, { maxRowsPerActor: 3 });
  assert.equal(filteredBot.length, 3);

  const records = [
    ...Array.from({ length: 6 }, (_, index) =>
      weekendCafeCapture({ actorId: index + 1, hour: 15 }),
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      weekendCafeCapture({ actorId: index + 10, hour: 16 }),
    ),
    ...Array.from({ length: 3 }, (_, index) =>
      weekendCafeCapture({ actorId: index + 20, hour: 11 }),
    ),
    ...botFlood,
  ];

  const analysis = aggregateTrendCaptureDensity(records, { minContributors: 5 });
  assert.ok(analysis);
  assert.equal(analysis!.hotspot_area, "성수동");
  assert.equal(analysis!.category, "카페");
  assert.equal(analysis!.day_segment, "weekend");
  assert.equal(analysis!.peak_bucket_start, 15);
  assert.equal(analysis!.peak_hour, "15:00 - 16:00");
  assert.ok(["medium", "high"].includes(analysis!.trend_velocity));

  const weekdayRows = Array.from({ length: 6 }, (_, index) => ({
    actorHash: actor(index + 1),
    location: "성수동",
    category: "카페",
    timestamp: `2026-06-17T09:${String(10 + index).padStart(2, "0")}:00+09:00`,
  }));
  const weekendOnly = aggregateTrendForLocationCategory({
    records: [...records, ...weekdayRows],
    location: "성수동",
    category: "카페",
    daySegment: "weekday",
    options: { minContributors: 5 },
  });
  assert.ok(weekendOnly);
  assert.equal(weekendOnly!.day_segment, "weekday");
  assert.equal(weekendOnly!.peak_bucket_start, 9);

  const pipeline = runTrendCaptureAnalysisPipeline({
    records,
    options: { minContributors: 5 },
    delivery: {
      userCaptureTimestamp: "2026-06-20T15:20:00+09:00",
      userLocation: "성수동",
    },
  });
  assert.ok(pipeline.analysis);
  assert.ok(pipeline.contextMessage);
  assert.ok(pipeline.analysisLlm.user.includes("성수동"));
  assert.ok(pipeline.contextLlm?.user.includes("capture_timestamp"));
  assert.ok(pipeline.contextMessage!.body.includes("성수동"));

  const aligned = formatTrendContextMessage({
    analysis: analysis!,
    userCaptureTimestamp: "2026-06-20T15:10:00+09:00",
    userLocation: "성수동",
  }, { honorific: "성용님" });
  assert.ok(aligned.headline.includes("딱 맞았어요"));

  console.log("test-trend-capture-analysis: ok");
}

main();
