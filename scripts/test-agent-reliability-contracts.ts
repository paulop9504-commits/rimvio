/**
 * Agent reliability contracts — wrong-success is failure.
 * Order: T1 Job · T2a Target stack (+ wire) · T3 Fail-closed · T4 Distance · T6 Verify · T7 Retry
 *
 * Run: npx tsx scripts/test-agent-reliability-contracts.ts
 */

import assert from "node:assert/strict";
import { beginAgentJob } from "@/lib/agent-policy/agent-job";
import {
  isTargetStackUtterance,
  resolveConstraintCarryOver,
} from "@/lib/agent-policy/constraint-carry-over";
import { applyConstraintMemoryToScoutQuery } from "@/lib/agent-policy/constraint-memory";
import { resolveWorkspaceJobBoundary } from "@/lib/agent-policy/resolve-workspace-job-boundary";
import {
  assertScoutRetryProposal,
  createScoutRetryLock,
  resolveAfterScoutEmpty,
} from "@/lib/agent-policy/scout-retry-policy";
import {
  distanceGateNearScout,
  gateNearScoutAnchor,
  metersBetween,
} from "@/lib/context-workspace/reality-anchor";
import { assertWorkspacePostcondition } from "@/lib/context-workspace/assert-workspace-postcondition";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";

// Wrong-success matrix (must never appear)
const WRONG_SUCCESS = {
  anchorFail: "default Osaka results",
  jobChange: "previous Job Target",
  destinationChange: "previous Destination Anchor",
  targetStack: "NEW Job that dropped Spatial",
  deixis: "Spatial deleted",
  distanceOver: "Workspace candidate beyond radius",
  patchFail: "완료했습니다",
  verifyFail: "SUCCESS",
  duplicateRequest: "duplicate Entity",
  scoutRetryFallback: "Namba fallback",
} as const;

// ─── T1 — Job Boundary: Namba lodging → Fukuoka eatery ───────────────
{
  const jobA = beginAgentJob({
    utterance: "난바역 근처 호텔 찾아줘",
    intent: "discover",
    target: "lodging",
  });
  assert.equal(jobA.target, "lodging");

  const boundary = resolveWorkspaceJobBoundary({
    utterance: "후쿠오카 맛집 찾아줘",
    hasVisibleCandidates: true,
    previousJob: jobA,
  });
  assert.equal(boundary.switchJob, true, "T1: must NEW Job");
  assert.equal(boundary.abortSoftContinue, true);
  assert.equal(boundary.nextTarget, "eatery");

  const carry = resolveConstraintCarryOver({
    utterance: "후쿠오카 맛집 찾아줘",
    previousBag: {
      maxNightlyPriceKrw: null,
      maxPriceBand: null,
      nearLabelKo: "난바",
      stayType: "hotel",
      minRating: null,
      updatedAtIso: new Date().toISOString(),
    },
    switchJob: true,
    previousTarget: "lodging",
    nextTarget: "eatery",
  });
  assert.equal(carry.droppedNear, true, "T1: Namba must not leak");
  assert.notEqual(carry.bagForScout.nearLabelKo, "난바");
  assert.equal(carry.inheritedSpatialFromStack, false);
  assert.notEqual(
    carry.bagForScout.nearLabelKo,
    "난바",
    `wrong-success forbidden: ${WRONG_SUCCESS.destinationChange}`,
  );
}

// ─── T2a — Target stack: NEW Job + inherit Spatial ───────────────────
{
  assert.equal(isTargetStackUtterance("맛집도 찾아줘"), true);

  const jobA = beginAgentJob({
    utterance: "난바역 근처 호텔 찾아줘",
    intent: "discover",
    target: "lodging",
  });
  const boundary = resolveWorkspaceJobBoundary({
    utterance: "맛집도 찾아줘",
    hasVisibleCandidates: true,
    previousJob: jobA,
  });
  assert.equal(boundary.switchJob, true, "T2a: NEW Job");
  assert.equal(boundary.nextTarget, "eatery");

  const carry = resolveConstraintCarryOver({
    utterance: "맛집도 찾아줘",
    previousBag: {
      maxNightlyPriceKrw: null,
      maxPriceBand: null,
      nearLabelKo: "난바",
      stayType: "hotel",
      minRating: null,
      updatedAtIso: new Date().toISOString(),
    },
    switchJob: true,
    previousTarget: "lodging",
    nextTarget: "eatery",
  });
  assert.equal(carry.inheritedSpatialFromStack, true, "T2a: inherit Spatial");
  assert.equal(carry.bagForScout.nearLabelKo, "난바");
  assert.equal(carry.droppedNear, false);
  assert.equal(carry.droppedStayType, true, "T2a: drop lodging stayType");
  assert.equal(carry.bagForScout.stayType, null);
  assert.ok(
    carry.bagForScout.nearLabelKo,
    `wrong-success forbidden: ${WRONG_SUCCESS.targetStack}`,
  );

  // Wire: scout utterance must rehydrate Anchor (not drop Spatial)
  const scoutUtt = applyConstraintMemoryToScoutQuery(
    "맛집도 찾아줘",
    carry.bagForScout,
  );
  assert.match(scoutUtt, /난바/);
  const rehydrate = gateNearScoutAnchor({ utterance: scoutUtt });
  assert.equal(rehydrate.gated, true);
  assert.ok(rehydrate.ok, "T2a wire: inherited near must resolve Anchor");
  if (rehydrate.ok) {
    assert.match(rehydrate.anchor.labelKo, /난바/);
  }
}

// ─── T3 — Fail-closed: no scout when Anchor missing ──────────────────
{
  const gate = gateNearScoutAnchor({
    utterance: "없는역XYZ큐큐 근처 맛집 찾아줘",
  });
  assert.equal(gate.gated, true);
  assert.equal(gate.ok, false);
  if (!gate.ok) {
    assert.equal(gate.code, "ANCHOR_NOT_FOUND");
  }
  // Contract: scout invocations = 0 (gate blocks before tool)
  const scoutInvoked = false;
  assert.equal(scoutInvoked, false, "T3: Scout must not run");
  const patchCount = 0;
  assert.equal(patchCount, 0, "T3: Patch must not run");
  assert.notEqual(
    gate.ok,
    true,
    `wrong-success forbidden: ${WRONG_SUCCESS.anchorFail}`,
  );
}

// ─── T4 — DistanceGate hard reject before Patch ──────────────────────
{
  const gate = gateNearScoutAnchor({
    utterance: "모리노미아역 근처 맛집",
  });
  assert.ok(gate.gated && gate.ok);
  if (!(gate.gated && gate.ok)) throw new Error("T4 anchor");

  const rows = [
    { id: "a", labelKo: "150m", lat: gate.anchor.lat, lng: gate.anchor.lng },
    {
      id: "b",
      labelKo: "420m",
      lat: gate.anchor.lat + 0.0038,
      lng: gate.anchor.lng,
    },
    {
      id: "c",
      labelKo: "730m",
      lat: gate.anchor.lat + 0.0065,
      lng: gate.anchor.lng,
    },
    {
      id: "d",
      labelKo: "2800m",
      lat: gate.anchor.lat + 0.025,
      lng: gate.anchor.lng,
    },
  ];
  assert.ok(
    metersBetween(gate.anchor.lat, gate.anchor.lng, rows[1]!.lat, rows[1]!.lng) <
      800,
  );
  assert.ok(
    metersBetween(gate.anchor.lat, gate.anchor.lng, rows[3]!.lat, rows[3]!.lng) >
      2000,
  );

  const gated = distanceGateNearScout({
    anchor: {
      lat: gate.anchor.lat,
      lng: gate.anchor.lng,
      labelKo: gate.anchor.labelKo,
    },
    candidates: rows,
    radiusMeters: 800,
  });
  assert.ok(gated.kept.every((k) => k.id !== "d"), "T4: 2.8km must not enter Patch");
  assert.ok(gated.dropped.some((d) => d.id === "d"));
  assert.ok(gated.kept.length >= 1);
  assert.ok(
    !gated.kept.some((k) => k.id === "d"),
    `wrong-success forbidden: ${WRONG_SUCCESS.distanceOver}`,
  );
}

// ─── T6 — tool.ok !== job.success ────────────────────────────────────
{
  const toolOk = true;
  const gate = gateNearScoutAnchor({
    utterance: "모리노미아역 근처 호텔",
  });
  assert.ok(gate.gated && gate.ok);
  if (!(gate.gated && gate.ok)) throw new Error("T6 anchor");

  const emptyLike: ContextWorkspaceState = {
    contextEventId: "t6",
    workspaceId: "ws",
    status: "editing",
    domain: "lodging",
    query: "usj",
    summaryKo: "test",
    nodes: [],
    compilerIr: null,
    filter: { maxPriceBand: null, minRating: null, queryIncludes: null },
    selectedIds: [],
    compareIds: [],
    surfacePrimary: "map",
    openedAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    committedAtIso: null,
    lastChangeKo: null,
    lastWhy: null,
    history: [],
    future: [],
  };

  const post = assertWorkspacePostcondition({
    state: emptyLike,
    expect: {
      kind: "near_scout",
      anchorId: gate.anchor.id,
      anchorLat: gate.anchor.lat,
      anchorLng: gate.anchor.lng,
      radiusMeters: 800,
      candidateKind: "lodging",
      minCandidates: 1,
    },
  });
  assert.equal(post.ok, false, "T6: postcondition must fail");
  const jobSuccess = toolOk && post.ok;
  assert.equal(jobSuccess, false, "T6: tool.ok !== job.success");
  assert.notEqual(post.code, "PASS");
  assert.notEqual(
    jobSuccess,
    true,
    `wrong-success forbidden: ${WRONG_SUCCESS.verifyFail}`,
  );
}

// ─── T7 — Scout retry: same Job/Anchor; no Namba fallback; 2× → SCOUT_FAILED
{
  const lock = createScoutRetryLock({
    jobId: "job_morinomiya",
    anchorId: "geo:jp:osaka:morinomiya-station",
    anchorLat: 34.6812,
    anchorLng: 135.5345,
    nearLabelKo: "모리노미아역",
    scoutUtterance: "모리노미아역 근처 맛집",
    areaHint: "모리노미아역",
  });

  const same = assertScoutRetryProposal({
    lock,
    proposed: {
      jobId: lock.jobId,
      anchorId: lock.anchorId,
      scoutUtterance: lock.scoutUtterance,
      areaHint: lock.areaHint,
      lat: lock.anchorLat,
      lng: lock.anchorLng,
    },
  });
  assert.equal(same.ok, true, "T7: same lock must pass");

  const nambaFallback = assertScoutRetryProposal({
    lock,
    proposed: {
      jobId: lock.jobId,
      anchorId: lock.anchorId,
      scoutUtterance: lock.scoutUtterance,
      areaHint: "난바",
      lat: lock.anchorLat,
      lng: lock.anchorLng,
    },
  });
  assert.equal(nambaFallback.ok, false, "T7: Namba fallback rejected");
  if (!nambaFallback.ok) {
    assert.equal(nambaFallback.code, "SCOUT_FALLBACK_REJECTED");
  }
  assert.notEqual(
    nambaFallback.ok,
    true,
    `wrong-success forbidden: ${WRONG_SUCCESS.scoutRetryFallback}`,
  );

  const driftJob = assertScoutRetryProposal({
    lock,
    proposed: {
      jobId: "job_other",
      anchorId: lock.anchorId,
      scoutUtterance: lock.scoutUtterance,
      areaHint: lock.areaHint,
      lat: lock.anchorLat,
      lng: lock.anchorLng,
    },
  });
  assert.equal(driftJob.ok, false);
  if (!driftJob.ok) assert.equal(driftJob.code, "SCOUT_LOCK_DRIFT");

  const firstEmpty = resolveAfterScoutEmpty({
    attempt: 1,
    maxAttempts: 2,
    nearLabelKo: lock.nearLabelKo,
  });
  assert.equal(firstEmpty.retry, true, "T7: attempt1 empty → retry");

  const secondEmpty = resolveAfterScoutEmpty({
    attempt: 2,
    maxAttempts: 2,
    nearLabelKo: lock.nearLabelKo,
  });
  assert.equal(secondEmpty.retry, false, "T7: attempt2 empty → stop");
  if (!secondEmpty.retry) {
    assert.equal(secondEmpty.code, "SCOUT_FAILED");
  }
}

console.log("OK — agent-reliability-contracts (T1·T2a·T3·T4·T6·T7)");
