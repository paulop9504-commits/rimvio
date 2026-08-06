/**
 * Agent Operating Constitution — 25 laws + replace/refine + dual surfaces.
 * Run: npx tsx scripts/test-cursor-agent-policy.ts
 */

import assert from "node:assert/strict";
import {
  AGENT_CONSTITUTION_BANDS,
  AGENT_CONSTITUTION_LAWS,
  AGENT_CONSTITUTION_VERSION,
  projectAgentTurnSurfaces,
  resolveWorkspaceMutationMode,
} from "@/lib/agent-policy";

function main() {
  assert.equal(AGENT_CONSTITUTION_VERSION, "agent-constitution.v1");
  assert.equal(AGENT_CONSTITUTION_LAWS.length, 25);
  assert.equal(AGENT_CONSTITUTION_BANDS.cursorSpine.length, 10);
  assert.equal(AGENT_CONSTITUTION_BANDS.realityOs.length, 15);
  assert.ok(AGENT_CONSTITUTION_LAWS.includes("reality_first_text_second"));
  assert.ok(AGENT_CONSTITUTION_LAWS.includes("user_owns_commit"));
  assert.ok(AGENT_CONSTITUTION_LAWS.includes("agent_leaves_breadcrumbs"));

  {
    const d = resolveWorkspaceMutationMode({
      utterance: "난바 쪽으로 해줘",
      hasVisibleCandidates: true,
    });
    assert.equal(d.mode, "replace");
    assert.equal(d.reason, "clear_location");
  }

  {
    const d = resolveWorkspaceMutationMode({
      utterance: "더 싸게",
      hasVisibleCandidates: true,
    });
    assert.equal(d.mode, "refine");
    assert.ok(d.reason === "soft_rank" || d.reason === "soft_filter");
  }

  {
    const d = resolveWorkspaceMutationMode({
      utterance: "하루에 3만원대로 다시 찾아",
      hasVisibleCandidates: true,
    });
    assert.equal(d.mode, "replace");
    assert.equal(d.reason, "clear_hard_price");
  }

  {
    const d = resolveWorkspaceMutationMode({
      utterance: "다시 찾아줘",
      hasVisibleCandidates: true,
    });
    assert.equal(d.mode, "replace");
  }

  {
    const d = resolveWorkspaceMutationMode({
      utterance: "캡슐호텔로 찾아줘",
      hasVisibleCandidates: true,
    });
    assert.equal(d.mode, "replace");
    assert.equal(d.reason, "clear_stay_type");
  }

  {
    const surfaces = projectAgentTurnSurfaces({
      mutationMode: "replace",
      reasonKo: "위치를 반영해 후보를 다시 찾았어요",
      factsKo: ["난바 중심"],
      candidateCount: 4,
      entityTitlesKo: ["호텔 A"],
    });
    assert.ok(surfaces.calloutLinesKo.length >= 1);
    assert.ok(surfaces.calloutLinesKo.length <= 3);
    assert.match(surfaces.llmReplyKo, /교체|다시/);
    assert.ok(!surfaces.llmReplyKo.includes("\n\n"));
  }

  console.log("ok — agent operating constitution");
}

main();
