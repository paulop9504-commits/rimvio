#!/usr/bin/env npx tsx
/**
 * Workspace Vision plan parser — Cursor-like image → scout JSON.
 */
import assert from "node:assert/strict";
import {
  parseWorkspaceVisionPlan,
  utteranceFromWorkspaceVisionPlan,
} from "@/lib/context-run/workspace-vision-plan";

const plan = parseWorkspaceVisionPlan(`{
  "intentKo": "메뉴판에서 라멘 가게 찾기",
  "scoutQuery": "오사카 난바 라멘집 찾아줘",
  "domain": "eatery",
  "statusKo": "메뉴판 → 난바 라멘 검색",
  "work": "scout"
}`);
assert.ok(plan);
assert.equal(plan!.domain, "eatery");
assert.equal(plan!.work, "scout");
assert.match(plan!.scoutQuery, /라멘/);
assert.equal(
  utteranceFromWorkspaceVisionPlan(plan!),
  "오사카 난바 라멘집 찾아줘",
);

assert.equal(parseWorkspaceVisionPlan("not json"), null);
assert.equal(parseWorkspaceVisionPlan("{}"), null);

console.log("ok workspace-vision-plan");
