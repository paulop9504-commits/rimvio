#!/usr/bin/env npx tsx
/**
 * Golden path polish — continuum → lodging sync → hotel Focus → Commit Field.
 */

import assert from "node:assert/strict";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { runWorkspaceIntentContinuum } from "../lib/workspace-kind";
import {
  buildWorkspaceSdkFrame,
  readWorkspaceSdkSession,
  runWorkspaceSdkCommit,
  runWorkspaceSdkFocusAdvance,
  syncTravelSdkFrameAfterLodgingSeed,
  writeWorkspaceSdkSession,
} from "../lib/workspace-sdk";

resetGraphCommandStoreForTests();
clearSessionGraphs();
clearPreparedRealityOperations();

const continuum = runWorkspaceIntentContinuum({
  utterance: "오사카 4박 5일 여행 갈 거야",
  graphId: "graph-sdk-golden",
  createIfMissing: true,
});
assert.ok(continuum);
assert.equal(continuum!.sdkFrame.primaryFocus.slotId, "flight");
assert.equal(
  readWorkspaceSdkSession(continuum!.contextEventId)?.primaryFocus.slotId,
  "flight",
);

const afterSeed = syncTravelSdkFrameAfterLodgingSeed({
  contextEventId: continuum!.contextEventId,
  candidateCount: 3,
  headerTitleKo: continuum!.sdkFrame.header.titleKo,
});
assert.ok(afterSeed);
assert.equal(afterSeed!.primaryFocus.slotId, "hotel");
assert.equal(
  readWorkspaceSdkSession(continuum!.contextEventId)?.primaryFocus.slotId,
  "hotel",
);
assert.match(afterSeed!.ai.stripHintKo ?? "", /후보 3곳/);

{
  const flight = buildWorkspaceSdkFrame({
    kind: "travel",
    contextEventId: continuum!.contextEventId,
    focusSlotId: "flight",
    focusLabelKo: "항공",
    lifecycle: "focused",
  });
  writeWorkspaceSdkSession(flight);
  const advanced = runWorkspaceSdkFocusAdvance({ frame: flight });
  assert.equal(advanced.ok, true);
  if (advanced.ok) {
    assert.equal(advanced.frame.primaryFocus.slotId, "hotel");
  }
}

{
  const ready = buildWorkspaceSdkFrame({
    kind: "travel",
    contextEventId: continuum!.contextEventId,
    focusSlotId: "hotel",
    focusLabelKo: "숙소 선택",
    lifecycle: "action_ready",
  });
  writeWorkspaceSdkSession({
    ...ready,
    commit: {
      ...ready.commit,
      labelKo: "결재함에서 승인",
    },
    ai: {
      ...ready.ai,
      stripHintKo: "테스트호텔 예약 준비를 결재함에 담았어요",
    },
  });
  const session = readWorkspaceSdkSession(continuum!.contextEventId);
  assert.ok(session);
  assert.equal(session!.lifecycle, "action_ready");
  assert.match(session!.commit.labelKo, /결재함/);

  const commit = runWorkspaceSdkCommit({ frame: session! });
  assert.equal(commit.ok, true);
  if (commit.ok) {
    assert.equal(commit.openedField, true);
    assert.equal(commit.frame.lifecycle, "awaiting_commit");
  }
}

console.log("ok — workspace-sdk-golden-path");
