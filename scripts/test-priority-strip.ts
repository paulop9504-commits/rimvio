import assert from "node:assert/strict";
import { resolvePriorityStrip } from "../lib/globe/priority-strip/resolve-priority-strip";
import type { PriorityStripPayload } from "../lib/globe/priority-strip/types";
import type { PersonaPendingLearn } from "../lib/persona/types";
import type { WorkQueueItem } from "../lib/work-queue";

const learn: PersonaPendingLearn = {
  id: "learn-1",
  axisId: "travel.pace",
  titleKo: "동선",
  kind: "help",
  choices: [
    { id: "a", labelKo: "A", value: "a" },
    { id: "b", labelKo: "B", value: "b" },
  ],
  createdAtIso: "2026-07-04T00:00:00.000Z",
};

const queueItem: WorkQueueItem = {
  id: "q1",
  graphId: "g1",
  kind: "travel_context",
  surface: "inner",
  titleKo: "여행 이어하기",
  subtitleKo: "슬롯",
  status: "slot_collect",
  seedMessage: "오사카",
  needsMedia: false,
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

const candidates: PriorityStripPayload[] = [
  {
    kind: "queue",
    id: "queue-q1",
    titleKo: queueItem.titleKo,
    subtitleKo: queueItem.subtitleKo,
    queueItem,
    queueCount: 1,
    autoExpand: false,
  },
  {
    kind: "help_learn",
    id: "learn-1",
    titleKo: learn.titleKo,
    learn,
    autoExpand: true,
  },
  {
    kind: "main_action",
    id: "main-ticket",
    titleKo: "탑승권",
    subtitleKo: "김포",
    ctaLabelKo: "QR 열기",
    actionKind: "show_qr",
    href: "https://example.com/qr.png",
    qrSrc: "https://example.com/qr.png",
    eventId: "e1",
    resourceId: "r1",
    autoExpand: true,
  },
  {
    kind: "protect",
    id: "protect-1",
    titleKo: "알러지",
    learn: { ...learn, id: "protect-1", kind: "protect" },
    autoExpand: true,
  },
];

const top = resolvePriorityStrip(candidates);
assert.equal(top?.kind, "protect");
assert.equal(top?.id, "protect-1");

const withoutProtect = resolvePriorityStrip(
  candidates.filter((row) => row.kind !== "protect"),
);
assert.equal(withoutProtect?.kind, "main_action");

const learnOnly = resolvePriorityStrip(
  candidates.filter((row) => row.kind === "help_learn" || row.kind === "queue"),
);
assert.equal(learnOnly?.kind, "help_learn");

assert.equal(resolvePriorityStrip([]), null);

console.log("test-priority-strip: ok");
