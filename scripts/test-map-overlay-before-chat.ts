#!/usr/bin/env npx tsx
/**
 * Map overlay utterances must not fall into free-talk / LLM essay.
 * Run: npx tsx scripts/test-map-overlay-before-chat.ts
 */
import assert from "node:assert/strict";
import {
  looksLikeMapOverlayUtterance,
  tryApplyMapOverlayTurn,
} from "@/lib/context-run/try-apply-map-overlay-turn";
import { resolveRealityNeedFromUtterance } from "@/lib/reality-provider";
import { looksLikeConversationalAsk } from "@/lib/context-run/try-apply-conversational-turn";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { resolveOsakaMetroOverlayCommand } from "@/lib/geo/osaka-metro/resolve-metro-overlay-command";

const cases = [
  "지하철 노선도 보여줘",
  "노선도 보여줘",
  "지하철 노선도 깔아줘",
  "노선도 깔아줘",
  "오사카 메트로 켜줘",
];

for (const u of cases) {
  assert.equal(looksLikeMapOverlayUtterance(u), true, u);
  assert.equal(looksLikeConversationalAsk(u), false, `chat? ${u}`);
  assert.equal(isWorkspaceAgentWorkUtterance(u), true, `work? ${u}`);
  assert.ok(resolveRealityNeedFromUtterance(u), `need? ${u}`);
  assert.ok(
    tryApplyMapOverlayTurn({ utterance: u }) ||
      resolveOsakaMetroOverlayCommand(u),
    `apply? ${u}`,
  );
}

assert.equal(looksLikeMapOverlayUtterance("지하철역에서 만나자"), false);
assert.equal(resolveOsakaMetroOverlayCommand("노선도 깔아줘")?.op, "show_all");

console.log("test-map-overlay-before-chat: ok");
