/**
 * Reality OS — context photo/video projects onto Workspace 2D map (not 3D autoplay).
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  isWorkspaceContextMediaPinId,
  prepareTripWorkspaceDraft,
  projectWorkspaceContextMediaPins,
  WORKSPACE_CONTEXT_MEDIA_PIN_PREFIX,
} from "../lib/context-workspace";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { FEED_CAPTURES_META_KEY } from "../lib/events/event-metadata-keys";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { readContextWorkspace } from "../lib/context-workspace/workspace-store";

const CTX = "test:workspace-context-media-map";
const stamp = "2026-07-20T10:00:00.000Z";

resetEventCandidatesForTests([]);
clearContextWorkspace(CTX);

commitEventUpsert({
  id: CTX,
  title: "오사카 여행",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: "2026-08-01T09:00:00.000Z",
  place: "오사카",
  confidence: 1,
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
  metadata: {
    [FEED_CAPTURES_META_KEY]: [
      {
        id: "cap-dotonbori",
        kind: "photo",
        capturedAtIso: stamp,
        label: "도톤보리",
        placeLabel: "도톤보리",
        url: "https://cdn.example.com/dotonbori.jpg",
        lat: 34.6687,
        lng: 135.5013,
      },
      {
        id: "cap-video",
        kind: "video",
        capturedAtIso: stamp,
        label: "야경",
        placeLabel: "오사카",
        url: "https://cdn.example.com/night.mp4",
        lat: 34.6937,
        lng: 135.5023,
      },
    ],
  },
});

const draft = prepareTripWorkspaceDraft({
  utterance: "오사카 여행",
  contextEventId: CTX,
  tripPrep: {
    destinationKo: "오사카",
    nights: 2,
    days: 3,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
});
assert.ok(draft);

const event = {
  id: CTX,
  title: "오사카 여행",
  category: "travel" as const,
  source: "manual" as const,
  lifecycle: "active" as const,
  datetime: "2026-08-01T09:00:00.000Z",
  place: "오사카",
  description: "",
  confidence: 1,
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
  metadata: {
    [FEED_CAPTURES_META_KEY]: [
      {
        id: "cap-dotonbori",
        kind: "photo" as const,
        capturedAtIso: stamp,
        label: "도톤보리",
        placeLabel: "도톤보리",
        url: "https://cdn.example.com/dotonbori.jpg",
        lat: 34.6687,
        lng: 135.5013,
      },
      {
        id: "cap-video",
        kind: "video" as const,
        capturedAtIso: stamp,
        label: "야경",
        placeLabel: "오사카",
        url: "https://cdn.example.com/night.mp4",
        lat: 34.6937,
        lng: 135.5023,
      },
    ],
  },
};

const nodes = readContextWorkspace(CTX)?.nodes.filter((n) => n.visible) ?? [];
const pins = projectWorkspaceContextMediaPins({ event, nodes });
assert.ok(pins.length >= 2, `expected media pins, got ${pins.length}`);
assert.ok(pins.every((p) => isWorkspaceContextMediaPinId(p.id)));
assert.ok(pins.every((p) => p.id.startsWith(WORKSPACE_CONTEXT_MEDIA_PIN_PREFIX)));
assert.ok(pins.every((p) => p.contextMedia != null));
assert.equal(pins.find((p) => p.contextMedia?.kind === "photo")?.lat, 34.6687);
assert.equal(pins.find((p) => p.contextMedia?.kind === "video")?.contextMedia?.kind, "video");
assert.ok(
  pins.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
  "media pins must sit on the Workspace map",
);

clearContextWorkspace(CTX);
console.log("ok: workspace context media → 2D map pins");
