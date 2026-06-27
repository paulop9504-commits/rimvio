import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  resetNotificationStoreForTests,
  bridgeInviteNotificationId,
  locationConfirmNotificationId,
} from "../lib/ontology";
import { projectExperienceSubgraph } from "../lib/experience-graph/project-experience-subgraph";
import { projectPendingNotifications } from "../lib/globe/inbox/project-pending-notifications";
import {
  getHubActionTypeForService,
  listRimvioActionTypes,
} from "../lib/event-kernel/action-contracts/rimvio-action-type-registry";
import { scoreHubServiceRowBase } from "../lib/globe/context-hub/score-hub-service-row";
import type { ContextHubServiceRow } from "../lib/globe/context-hub/context-hub-service-catalog";

resetNotificationStoreForTests();

const mockEvent: EventCandidate = {
  id: "ec:test-trip",
  title: "제주",
  category: "travel",
  source: "manual",
  lifecycle: "scheduled",
  datetime: "2026-06-20T10:00:00+09:00",
  place: "제주",
  confidence: 0.8,
  metadata: {
    experienceBridgeHost: true,
    experienceBridgeId: "bridge-1",
    feedCaptures: [
      {
        id: "cap-1",
        kind: "photo",
        capturedAtIso: "2026-06-20T11:00:00+09:00",
        verified: true,
      },
    ],
  },
  lifecycleUpdatedAt: "2026-06-20T09:00:00+09:00",
  createdAt: "2026-06-20T09:00:00+09:00",
  updatedAt: "2026-06-20T09:00:00+09:00",
};

const subgraph = projectExperienceSubgraph(mockEvent);
assert.equal(subgraph.experience.id, "ec:test-trip");
assert.equal(subgraph.captures.length, 1);
assert.equal(subgraph.captures[0]?.id, "cap-1");
assert.equal(subgraph.bridge?.experienceId, "ec:test-trip");

const notifications = projectPendingNotifications({
  invites: [],
  bridgeActivities: [
    {
      id: "upload:ec:test-trip",
      kind: "upload_pending",
      eventId: "ec:test-trip",
      title: "「제주」 공유 중",
      line: "친구에게 순간을 보내는 중이에요",
      ctaLabel: "맥락 열기",
      href: "/?recallEvent=ec%3Atest-trip",
      priority: 80,
    },
  ],
  locationConfirms: [
    {
      eventId: "ec:dwell",
      title: "체류",
      place: "그곳",
      datetime: "2026-06-20T12:00:00+09:00",
      kind: "gps_dwell",
      dwellMinutes: 43,
    },
  ],
});

assert.equal(notifications.length, 2);
assert.equal(notifications[0]?.kind, "bridge_activity");
assert.equal(notifications[1]?.id, locationConfirmNotificationId("ec:dwell"));

const dismissed = projectPendingNotifications({
  invites: [],
  bridgeActivities: [],
  locationConfirms: [],
  dismissedIds: new Set([bridgeInviteNotificationId("ec:x")]),
});

assert.equal(dismissed.length, 0);

const flightAction = getHubActionTypeForService("flight");
assert.ok(flightAction);
assert.equal(flightAction.actionTypeId, "hub.connect_flight");

const ticketRow: ContextHubServiceRow = {
  serviceId: "ticket",
  labelKo: "티켓",
  shortLabelKo: "티켓",
  implemented: true,
  offered: true,
  connected: true,
  link: null,
  flightOptions: [],
  handoffHref: "data:image/png;base64,x",
  handoffLabelKo: "QR",
};

const flightRow: ContextHubServiceRow = {
  serviceId: "flight",
  labelKo: "항공",
  shortLabelKo: "항공",
  implemented: true,
  offered: true,
  connected: false,
  link: null,
  flightOptions: [],
  handoffHref: null,
  handoffLabelKo: null,
};

assert.ok(scoreHubServiceRowBase(ticketRow) > scoreHubServiceRowBase(flightRow));

const mentionCount = listRimvioActionTypes().filter((row) => row.family === "mention").length;
assert.ok(mentionCount >= 20);

console.log("test-ontology-layer: ok");
