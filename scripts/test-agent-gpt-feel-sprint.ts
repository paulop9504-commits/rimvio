/**
 * GPT-feel surface contracts — Speak→react · Fail chips · Target switch · Action ladder.
 * Run: npx tsx scripts/test-agent-gpt-feel-sprint.ts
 */

import assert from "node:assert/strict";
import {
  ANCHOR_RETYPE_CHIP_UTTERANCE,
  buildAnchorFailSoftChips,
  gateNearScoutAnchor,
  rebuildNearScoutUtterance,
} from "@/lib/context-workspace/reality-anchor";
import { beginAgentJob } from "@/lib/agent-policy/agent-job";
import { resolveWorkspaceJobBoundary } from "@/lib/agent-policy/resolve-workspace-job-boundary";
import { resolveAgentActionLevel } from "@/lib/agent-policy/action-level-gate";
import { resolveWorkspaceSearchDomain } from "@/lib/context-workspace/resolve-workspace-search-domain";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";

// ─── 1 Speak path: near-scout Intent shape ───────────────────────────
{
  const gate = gateNearScoutAnchor({
    utterance: "난바역 근처 맛집 찾아줘",
  });
  assert.equal(gate.gated, true);
  assert.ok(gate.ok, "Namba eatery must resolve Anchor");
  if (gate.ok) {
    assert.match(gate.anchor.labelKo, /난바/);
  }
  assert.equal(resolveWorkspaceSearchDomain("난바역 근처 맛집 찾아줘", "lodging"), "eatery");
  const level = resolveAgentActionLevel("난바역 근처 맛집 찾아줘");
  assert.equal(level.level, "discover");
  assert.equal(level.discoverOnly, true);
  assert.equal(level.allowPrepare, false);
}

// ─── 2 Fail UX chips — never invent Osaka map pins ───────────────────
{
  const gate = gateNearScoutAnchor({
    utterance: "없는역XYZ큐큐 근처 맛집 찾아줘",
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) {
    assert.equal(gate.code, "ANCHOR_NOT_FOUND");
    assert.match(gate.statusKo, /찾지 못했어요/);
    const chips = buildAnchorFailSoftChips({
      utterance: "없는역XYZ큐큐 근처 맛집 찾아줘",
      code: gate.code,
      nearLabelKo: "없는역XYZ큐큐",
      candidates: gate.candidates,
    });
    assert.ok(chips.length >= 2);
    assert.ok(chips.some((c) => c.labelKo === "난바역"));
    assert.ok(chips.some((c) => c.utterance === ANCHOR_RETYPE_CHIP_UTTERANCE));
    const namba = chips.find((c) => c.labelKo === "난바역");
    assert.ok(namba);
    assert.match(namba!.utterance, /난바역/);
    assert.match(namba!.utterance, /맛집/);
    assert.ok(!namba!.utterance.includes("없는역XYZ"));
  }
  const rebuilt = rebuildNearScoutUtterance({
    utterance: "없는역XYZ큐큐 근처 맛집 찾아줘",
    nearLabelKo: "모리노미아역",
  });
  assert.match(rebuilt, /모리노미아역/);
}

// ─── 3 Target switch — eatery → capsule lodging = NEW Job + replace ─
{
  const jobA = beginAgentJob({
    utterance: "난바역 근처 맛집 찾아줘",
    intent: "discover",
    target: "eatery",
  });
  const boundary = resolveWorkspaceJobBoundary({
    utterance: "난바역 근처 캡슐호텔 찾아줘",
    hasVisibleCandidates: true,
    previousJob: jobA,
  });
  assert.equal(boundary.switchJob, true, "must NEW Job");
  assert.equal(boundary.abortSoftContinue, true);
  assert.equal(boundary.nextTarget, "lodging");
  assert.equal(
    resolveWorkspaceSearchDomain("난바역 근처 캡슐호텔 찾아줘", "eatery"),
    "lodging",
  );
  const stay = parseLodgingStayTypeFromText("난바역 근처 캡슐호텔 찾아줘");
  assert.ok(stay === "capsule" || stay === "capsule_hotel" || Boolean(stay));
}

// ─── 4 Action ladder NL levels ───────────────────────────────────────
{
  const discover = resolveAgentActionLevel("난바역 근처 맛집 찾아줘");
  assert.equal(discover.discoverOnly, true);
  assert.equal(discover.allowPrepare, false);

  const prepare = resolveAgentActionLevel("2번 식당 예약 준비해줘");
  assert.equal(prepare.level, "prepare");
  assert.equal(prepare.allowPrepare, true);
  assert.equal(prepare.discoverOnly, false);

  const commit = resolveAgentActionLevel("예약해 줘");
  assert.ok(commit.level === "commit" || commit.allowCommit);
}

console.log("OK — agent-gpt-feel-sprint (speak · fail-chips · target · ladder)");
