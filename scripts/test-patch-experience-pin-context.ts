import assert from "node:assert/strict";
import { resetCorrectionLogForTests } from "@/lib/corrections/correction-log";
import { resetEventCandidatesForTests, upsertEventCandidate } from "@/lib/events/event-store";
import {
  projectMirrorProvenanceSummary,
  readMirrorAudit,
  readMirrorProvenance,
  upsertMirrorProvenanceMetadata,
} from "@/lib/globe/mirror-provenance";
import { GLOBE_CONTEXT_NOTE_KEY } from "@/lib/globe/pin-context-note";
import { patchExperiencePinContext } from "@/lib/globe/patch-experience-pin-context";

function seedEvent() {
  const metadata = upsertMirrorProvenanceMetadata({
    metadata: { feedPlanEnabled: true },
    patch: {
      resourceKind: "globe_context",
      projectionMode: "shared_mirrored",
      visibility: "private",
      viewerScope: "bridge_participants",
      bridge: {
        bridgeId: "bridge-local-override",
      },
      origin: {
        sourceKind: "bridge_participant",
        originalAuthorUserId: "user-host",
        originalAuthorDisplayName: "민수",
        authoredAtIso: "2026-07-04T10:00:00.000Z",
        mirroredAtIso: "2026-07-04T10:05:00.000Z",
        originEventId: "evt-origin",
      },
      integrity: {
        attribution: "bridge_host",
        placeBasis: "shared",
        timeBasis: "shared",
        originality: "mirror_copy",
      },
      sync: {
        state: "synced",
        lastSyncedAtIso: "2026-07-04T10:05:00.000Z",
      },
      permissions: {
        viewerRole: "participant",
        editMode: "local_edits",
        reshareMode: "owner_only",
        deleteMode: "local_only",
      },
      overrides: {
        titleOverridden: false,
        placeOverridden: false,
        noteOverridden: false,
      },
    },
    nowIso: "2026-07-04T10:05:00.000Z",
  });
  return upsertEventCandidate({
    title: "계산동722",
    category: "social",
    source: "message",
    lifecycle: "confirmed",
    place: "계산동722",
    confidence: 0.7,
    metadata,
  });
}

async function main() {
  resetCorrectionLogForTests();
  resetEventCandidatesForTests();
  const event = seedEvent();

  const titled = await patchExperiencePinContext(event.id, {
    title: "둔산동 스타벅스 약속",
  });
  assert.equal(titled.title, "둔산동 스타벅스 약속");
  const titleProvenance = readMirrorProvenance(titled.metadata);
  assert.equal(titleProvenance?.overrides?.titleOverridden, true);
  assert.equal(titleProvenance?.overrides?.titleUpstreamValue, "계산동722");
  assert.equal(titleProvenance?.overrides?.titleLocalValue, "둔산동 스타벅스 약속");
  assert.equal(readMirrorAudit(titled.metadata).at(-1)?.action, "local_override_set");

  const placed = await patchExperiencePinContext(event.id, {
    place: "둔산동 스타벅스",
  });
  assert.ok(placed.place?.trim().length);
  assert.ok(placed.confidence >= event.confidence);
  const placeProvenance = readMirrorProvenance(placed.metadata);
  assert.equal(placeProvenance?.overrides?.placeOverridden, true);
  assert.equal(placeProvenance?.overrides?.placeUpstreamValue, "계산동722");
  assert.equal(placeProvenance?.overrides?.placeLocalValue, "둔산동 스타벅스");

  const noted = await patchExperiencePinContext(event.id, {
    note: "친구랑 다시 오기",
  });
  const noteProvenance = readMirrorProvenance(noted.metadata);
  assert.equal(noteProvenance?.overrides?.noteOverridden, true);
  assert.equal(noteProvenance?.overrides?.noteUpstreamValue, null);
  assert.equal(noteProvenance?.overrides?.noteLocalValue, "친구랑 다시 오기");
  assert.equal(noted.metadata?.[GLOBE_CONTEXT_NOTE_KEY], "친구랑 다시 오기");

  const clearedNote = await patchExperiencePinContext(event.id, {
    note: "",
  });
  const clearedSummary = projectMirrorProvenanceSummary({
    event: clearedNote,
    viewerUserId: "user-local",
  });
  assert.ok(clearedSummary?.hasLocalOverrides);
  assert.deepEqual(clearedSummary?.overrideFields, ["title", "place"]);
  assert.equal(readMirrorProvenance(clearedNote.metadata)?.overrides?.noteOverridden, undefined);
  assert.equal(clearedNote.metadata?.[GLOBE_CONTEXT_NOTE_KEY], undefined);
  assert.equal(readMirrorAudit(clearedNote.metadata).at(-1)?.action, "local_override_cleared");

  console.log("test-patch-experience-pin-context: ok");
}

void main();
