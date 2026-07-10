/**
 * Context recall badge + lodging slot chip labels.
 */

import assert from "node:assert/strict";
import { buildLodgingBookingSlotChipLabels } from "@/lib/globe/context-hub/build-lodging-booking-slot-chip-labels";
import {
  formatContextRecallBadgeLabel,
  summarizeContextRecall,
} from "@/lib/globe/context-hub/summarize-context-recall";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { createReserveAction } from "@/lib/globe/resource/hub-action-record";

const CONTEXT_COMMITTED_RESOURCES_META_KEY = "contextCommittedResources";
const CONTEXT_HUB_ACTION_LOG_META_KEY = "contextHubActionLog";

function stubEvent(overrides: Partial<EventCandidate> = {}): EventCandidate {
  return {
    id: "ctx-tokyo",
    title: "도쿄",
    category: "travel",
    source: "user",
    lifecycle: "active",
    datetime: "2026-06-10T00:00:00.000Z",
    place: "도쿄",
    description: null,
    confidence: 1,
    lifecycleUpdatedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

// —— recall summary ——
{
  const empty = summarizeContextRecall(null);
  assert.equal(empty.confirmedCount, 0);

  const lodgingOnly = stubEvent({
    metadata: {
      contextLodgingPinnedResourceId: "ctx-tokyo:lodging:abc",
    },
  });
  const lodgingSummary = summarizeContextRecall(lodgingOnly);
  assert.equal(lodgingSummary.hasLodging, true);
  assert.equal(lodgingSummary.confirmedCount, 1);
  assert.equal(formatContextRecallBadgeLabel(lodgingSummary), "확정 1건");

  const reserve = createReserveAction({
    contextEventId: "ctx-tokyo",
    resourceId: "ctx-tokyo:flight",
    sourceHubId: "flight",
    approvalPolicy: "user_tap",
    payload: { slot: { start: "2026-06-10", end: "2026-06-10" } },
  });
  const both = stubEvent({
    metadata: {
      contextLodgingPinnedResourceId: "ctx-tokyo:lodging:abc",
      [CONTEXT_HUB_ACTION_LOG_META_KEY]: [{ ...reserve, status: "success" }],
      [CONTEXT_COMMITTED_RESOURCES_META_KEY]: [
        {
          resourceId: "ctx-tokyo:lodging:abc",
          contextEventId: "ctx-tokyo",
          kind: "lodging_voucher",
          sourceHubId: "lodging",
          label: "신주쿠 호텔",
          createdAtIso: "2026-06-01T00:00:00.000Z",
        },
      ],
    },
  });
  const bothSummary = summarizeContextRecall(both);
  assert.equal(bothSummary.confirmedCount, 2);
  assert.equal(formatContextRecallBadgeLabel(bothSummary), "확정 2건");
}

// —— slot chips ——
{
  const chips = buildLodgingBookingSlotChipLabels(
    {
      checkInIso: "2026-06-10",
      checkOutIso: "2026-06-14",
      guestCount: 2,
      roomCount: 1,
    },
    stubEvent({
      metadata: {
        planWindowEndIso: "2026-06-14",
        contextLodgingGuestCount: 2,
        contextLodgingRoomCount: 1,
      },
    }),
  );
  assert.ok(chips.length >= 2);
  assert.ok(chips.some((chip) => chip.includes("게스트 2")));
}

console.log("test-context-recall-ui: ok");
