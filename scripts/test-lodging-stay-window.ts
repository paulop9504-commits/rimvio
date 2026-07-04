import assert from "node:assert/strict";
import {
  buildLodgingStayWindow,
  formatLodgingStayBadgeLabel,
  formatLodgingStayWindowLabel,
  resolveLodgingStayPhase,
} from "@/lib/globe/context-hub/lodging-stay-window";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

const event = commitEventUpsert({
  id: "ev-lodging-stay-window",
  title: "오사카 여행",
  category: "travel",
  source: "manual",
  lifecycle: "planned",
  datetime: "2026-07-10T19:30:00+09:00",
  place: "오사카",
  metadata: {
    feedPlanEnabled: true,
    planWindowEndIso: "2026-07-13T11:00:00+09:00",
  },
});

const stayWindow = buildLodgingStayWindow({ event });
assert.ok(stayWindow, "stay window derives from event plan data");
assert.equal(stayWindow?.checkInIso, "2026-07-10T19:30:00+09:00");
assert.equal(stayWindow?.checkOutIso, "2026-07-13T11:00:00+09:00");
assert.equal(stayWindow?.nights, 3);
assert.equal(
  formatLodgingStayWindowLabel(stayWindow),
  "7월 10일 – 7월 13일 · 3박",
);
assert.equal(
  formatLodgingStayBadgeLabel(stayWindow),
  "7월 10일-13일 · 3박",
);
assert.equal(
  resolveLodgingStayPhase(stayWindow, new Date("2026-07-10T21:00:00+09:00")),
  "check_in_day",
);
assert.equal(
  resolveLodgingStayPhase(stayWindow, new Date("2026-07-13T08:00:00+09:00")),
  "checkout_day",
);

console.log("test-lodging-stay-window: ok");
