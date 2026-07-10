/**
 * Playwright seed — Day 2 recall (durable metadata, empty session hub log).
 */

export const E2E_DAY2_RECALL_EVENT_ID = "evt-e2e-tokyo-day2";
export const E2E_DAY2_RECALL_RESOURCE_ID = `${E2E_DAY2_RECALL_EVENT_ID}:lodging:liteapi:lp1`;

const STAMP = "2026-07-10T00:00:00.000Z";

export function buildE2eDay2RecallSeed() {
  const purchase = {
    actionId: "e2e-purchase-1",
    contextEventId: E2E_DAY2_RECALL_EVENT_ID,
    resourceId: E2E_DAY2_RECALL_RESOURCE_ID,
    type: "purchase" as const,
    status: "success" as const,
    sourceHubId: "lodging",
    approvalPolicy: "user_tap" as const,
    createdAt: STAMP,
    payload: { amount: 120_000, currency: "KRW", confirmationCode: "E2E-DAY2" },
  };

  const reserve = {
    actionId: "e2e-reserve-1",
    contextEventId: E2E_DAY2_RECALL_EVENT_ID,
    resourceId: E2E_DAY2_RECALL_RESOURCE_ID,
    type: "reserve" as const,
    status: "success" as const,
    sourceHubId: "lodging",
    approvalPolicy: "user_tap" as const,
    createdAt: STAMP,
    payload: {
      slot: { start: "2026-07-18", end: "2026-07-21" },
      guestCount: 2,
    },
  };

  const event = {
    id: E2E_DAY2_RECALL_EVENT_ID,
    title: "도쿄 여행",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    datetime: "2026-07-18T15:00:00.000Z",
    place: "도쿄",
    description: null,
    confidence: 1,
    lifecycleUpdatedAt: STAMP,
    createdAt: STAMP,
    updatedAt: STAMP,
    metadata: {
      feedPlanEnabled: true,
      tripLeg: "destination",
      tripRef: "trip-e2e-tokyo",
      planWindowEndIso: "2026-07-21T11:00:00.000Z",
      contextLodgingPinnedResourceId: E2E_DAY2_RECALL_RESOURCE_ID,
      contextLodgingHubEnabled: true,
      contextHubActionLog: [reserve, purchase],
    },
  };

  const personalPin = {
    pinId: "pin-e2e-tokyo-day2",
    eventId: E2E_DAY2_RECALL_EVENT_ID,
    lat: 35.6762,
    lng: 139.6503,
    placeLabel: "도쿄",
    experienceTitle: "도쿄 여행",
    photoCount: 0,
    videoCount: 0,
    createdAtIso: STAMP,
    acl: { viewerPeerThreadIds: [] as string[] },
    visibility: "private" as const,
    source: "experience" as const,
  };

  return { event, personalPin };
}

/** Install Day 2 recall fixture in browser storage (call from addInitScript). */
export function installE2eDay2RecallFixture(): void {
  const { event, personalPin } = buildE2eDay2RecallSeed();
  localStorage.setItem("rimvio-event-candidates.v1", JSON.stringify([event]));
  localStorage.setItem("rimvio.personal-globe-pins.v1", JSON.stringify([personalPin]));
  sessionStorage.setItem("rimvio.draw-redirected", "1");
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith("rimvio.hub-action-log.")) {
      sessionStorage.removeItem(key);
    }
  }
}
