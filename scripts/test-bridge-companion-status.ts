#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { FEED_CAPTURES_META_KEY } from "../lib/feed/feed-capture-types";
import { projectBridgeCompanionStatus } from "../lib/experience-bridge/project-bridge-companion-status";
import { projectBridgeStackPrep } from "../lib/experience-bridge/project-bridge-stack-prep";

function bridgeEvent(captures: unknown[]): EventCandidate {
  return {
    id: "trip-1",
    title: "제주",
    category: "travel",
    source: "globe",
    lifecycle: "active",
    datetime: "2026-06-01T00:00:00.000Z",
    place: "제주",
    confidence: 0.9,
    metadata: {
      experienceBridgeParticipant: true,
      [FEED_CAPTURES_META_KEY]: captures,
    },
  };
}

const ready = projectBridgeCompanionStatus({
  event: bridgeEvent([
    {
      id: "c1",
      kind: "photo",
      capturedAtIso: "2026-06-01T00:00:00.000Z",
      url: "https://cdn.example.com/a.jpg",
      ownerUserId: "u1",
    },
  ]),
  viewerUserId: "viewer",
});
assert.equal(ready?.tone, "ready");
assert.match(ready?.line ?? "", /순간 1개/);

const pending = projectBridgeCompanionStatus({
  event: bridgeEvent([
    {
      id: "c2",
      kind: "photo",
      capturedAtIso: "2026-06-01T00:00:00.000Z",
      ownerUserId: "friend",
    },
  ]),
  viewerUserId: "viewer",
});
assert.equal(pending?.tone, "pending");
assert.match(pending?.line ?? "", /친구 순간/);

const invitePrep = projectBridgeStackPrep({
  invites: [
    {
      state: {
        bridge: {
          eventId: "trip-1",
          hostUserId: "host",
          peerThreadId: null,
          title: "제주",
          placeLabel: "제주",
          lat: 33.4,
          lng: 126.5,
          eventSnapshot: bridgeEvent([]),
          createdAtIso: "2026-06-01T00:00:00.000Z",
        },
        participants: [
          {
            userId: "host",
            displayName: "민수",
            status: "accepted",
            role: "host",
            invitedAtIso: "2026-06-01T00:00:00.000Z",
            joinedAtIso: "2026-06-01T00:00:00.000Z",
          },
          {
            userId: "viewer",
            displayName: "나",
            status: "pending",
            role: "member",
            invitedAtIso: "2026-06-02T00:00:00.000Z",
            joinedAtIso: null,
          },
        ],
      },
      invite: {
        userId: "viewer",
        displayName: "나",
        status: "pending",
        role: "member",
        invitedAtIso: "2026-06-02T00:00:00.000Z",
        joinedAtIso: null,
      },
    },
  ],
  events: [],
  viewerUserId: "viewer",
  dismissedIds: new Set(),
});
assert.equal(invitePrep?.kind, "invite");
assert.equal(invitePrep?.href, "/?openGlobeInbox=1");

console.log("test-bridge-companion-status: ok");
