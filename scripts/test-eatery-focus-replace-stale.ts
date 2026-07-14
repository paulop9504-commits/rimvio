import assert from "node:assert/strict";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import {
  mergeScoutTurnConstraints,
  resolveAccumulatedEateryFocus,
  shouldCarryPriorEateryFocus,
} from "../lib/globe/context-condition-ai/scout-turn-constraints";
import { refineMessageForPipeline } from "../lib/messy-prompt-interpreter/refine-message-for-pipeline";
import { shouldInterpretMessyInput } from "../lib/messy-prompt-interpreter/should-interpret-messy-input";
import { interpretMessyPrompt } from "../lib/messy-prompt-interpreter/interpret-messy-prompt";

const priorMatchaConstraints = {
  eateryFocus: "말차 아이스크림",
  menuFocusId: "matcha_icecream",
  transport: null,
  budget: null,
  vibe: null,
  areaHint: null,
  excludeKeywords: [] as string[],
  updatedAtIso: "",
};

const priorMatchaSpec = {
  resourceTypes: ["restaurant"] as const,
  transport: "walk" as const,
  budget: "medium" as const,
  vibe: "popular" as const,
  lodgingKind: "any" as const,
  eateryFocus: "말차 아이스크림",
};

async function main() {
  const sushi = "초밥맛집 찾아줘";

  // Intent Convergence — re-search never carries prior dish.
  assert.equal(shouldCarryPriorEateryFocus(sushi), false);
  assert.equal(shouldCarryPriorEateryFocus("맛집 다시 찾아줘"), false);
  assert.equal(shouldCarryPriorEateryFocus("더 싸게"), true);

  assert.equal(
    resolveAccumulatedEateryFocus({
      message: sushi,
      prior: priorMatchaConstraints,
      previousSpec: priorMatchaSpec,
      menuFocusQuery: "말차 아이스크림",
    }),
    "스시 초밥",
  );

  assert.equal(
    resolveAccumulatedEateryFocus({
      message: "맛집 다시 찾아줘",
      prior: priorMatchaConstraints,
      previousSpec: priorMatchaSpec,
    }),
    null,
  );

  assert.equal(
    resolveAccumulatedEateryFocus({
      message: "더 싸게",
      prior: priorMatchaConstraints,
      previousSpec: priorMatchaSpec,
    }),
    "말차 아이스크림",
  );

  const merged = mergeScoutTurnConstraints({
    prior: priorMatchaConstraints,
    message: sushi,
  });
  assert.equal(merged.eateryFocus, "스시 초밥");
  assert.equal(merged.menuFocusId, "sushi");

  assert.equal(shouldInterpretMessyInput(sushi), false);

  const rules = await interpretMessyPrompt(sushi, { useLlm: false });
  assert.equal(refineMessageForPipeline(sushi, rules), sushi);

  const resolved = resolveLocalDiscoveryAction({
    message: sushi,
    answers: { menuFocus: "matcha_icecream" },
    followUpTurn: true,
    previousSpec: priorMatchaSpec,
    priorConstraints: priorMatchaConstraints,
    previousTriggerMessage: "말차 아이스크림 맛집",
  });
  assert.equal(resolved.status, "ready");
  if (resolved.status === "ready") {
    assert.equal(resolved.spec.eateryFocus, "스시 초밥");
  }

  // Broad re-search in same context — drop matcha, don't revive.
  const broad = resolveLocalDiscoveryAction({
    message: "맛집 다시 찾아줘",
    answers: { menuFocus: "matcha_icecream" },
    followUpTurn: true,
    previousSpec: priorMatchaSpec,
    priorConstraints: priorMatchaConstraints,
    previousTriggerMessage: "말차 아이스크림 맛집",
  });
  assert.equal(broad.status, "ready");
  if (broad.status === "ready") {
    assert.equal(broad.spec.eateryFocus ?? null, null);
  }

  console.log("test-eatery-focus-replace-stale: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
