#!/usr/bin/env npx tsx
/**
 * Action Ontology — ActionVerb + Target Resolver + IntentFamily mapping tests.
 */

import assert from "node:assert/strict";
import { classifyActionVerb } from "../lib/rimvio-command/action-verb";
import { resolveCommandTarget } from "../lib/rimvio-command/resolve-command-target";
import { resolveIntentFromActionVerb } from "../lib/rimvio-command/action-verb-to-intent";
import { routeRimvioCommandMode } from "../lib/rimvio-command/route-command-mode";

/* ── 1. classifyActionVerb — Top 30 verbs ────────────────── */

const VERB_CASES: [string, ReturnType<typeof classifyActionVerb>][] = [
  ["만들어줘", "create"],
  ["짜줘", "create"],
  ["계획해줘", "create"],
  ["찾아줘", "search"],
  ["추천해줘", "search"],
  ["보여줘", "search"],
  ["이동해줘", "move"],
  ["옮겨줘", "move"],
  ["안내해줘", "move"],
  ["예약해줘", "book"],
  ["잡아줘", "book"],
  ["구매해줘", "book"],
  ["준비해줘", "prepare"],
  ["챙겨줘", "prepare"],
  ["세팅해줘", "prepare"],
  ["바꿔줘", "edit"],
  ["수정해줘", "edit"],
  ["추가해줘", "edit"],
  ["비교해줘", "decision"],
  ["골라줘", "decision"],
  ["분석해줘", "analyze"],
  ["예상해줘", "analyze"],
  ["계산해줘", "analyze"],
  ["저장해줘", "memory"],
  ["기억해줘", "memory"],
  ["이어줘", "resume"],
  ["계속해줘", "resume"],
  ["공유해줘", "share"],
  ["실행해줘", "action"],
  ["적용해줘", "action"],
  ["취소해줘", "cancel"],
  ["되돌려줘", "cancel"],
  ["알아서 해줘", "auto"],
  ["맡길게", "auto"],
  ["다 해줘", "auto"],
];

for (const [input, expected] of VERB_CASES) {
  const actual = classifyActionVerb(input);
  assert.equal(actual, expected, `classifyActionVerb("${input}"): ${actual} ≠ ${expected}`);
}

/* ── 2. resolveCommandTarget — state-aware routing ───────── */

{
  const r = resolveCommandTarget({
    verb: "search",
    utterance: "호텔 찾아줘",
    activeContextId: null,
  });
  assert.equal(r.target, "new_context", "search on Globe → new_context");
}

{
  const r = resolveCommandTarget({
    verb: "search",
    utterance: "맛집 찾아줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.target, "current_context", "search in Context → current_context");
}

{
  const r = resolveCommandTarget({
    verb: "search",
    utterance: "더 싼 거 보여줘",
    activeContextId: "evt-osaka",
    activeWorkspaceId: "ws-hotel",
  });
  assert.equal(r.target, "current_workspace", "search in Workspace → current_workspace");
}

{
  const r = resolveCommandTarget({
    verb: "edit",
    utterance: "하루 더 늘려줘",
    activeContextId: "evt-osaka",
    selectedArtifactId: "art-itinerary",
  });
  assert.equal(r.target, "selected_artifact", "edit with artifact → selected_artifact");
}

{
  const r = resolveCommandTarget({
    verb: "book",
    utterance: "이 호텔 예약해줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.target, "external_reality", "book → external_reality");
}

{
  const r = resolveCommandTarget({
    verb: "resume",
    utterance: "이어줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.target, "current_context", "resume with active → current_context");
}

/* ── 3. resolveIntentFromActionVerb — verb+target→IntentFamily ─ */

{
  const i = resolveIntentFromActionVerb("search", "new_context", "호텔 찾아줘");
  assert.equal(i, "Create", "search + new_context → Create");
}

{
  const i = resolveIntentFromActionVerb("search", "current_workspace", "더 싼 거 보여줘");
  assert.equal(i, "Filter", "search + workspace → Filter");
}

{
  const i = resolveIntentFromActionVerb("book", "external_reality", "예약해줘");
  assert.equal(i, "Reserve", "book + reality → Reserve");
}

{
  const i = resolveIntentFromActionVerb("prepare", "current_context", "준비해줘");
  assert.equal(i, "Prepare", "prepare + context → Prepare");
}

{
  const i = resolveIntentFromActionVerb("prepare", "new_context", "제주 여행 준비해줘");
  assert.equal(i, "Create", "prepare + new_context → Create");
}

{
  const i = resolveIntentFromActionVerb("edit", "selected_artifact", "하루 더 늘려줘");
  assert.equal(i, "Revise", "edit + artifact → Revise");
}

/* ── 4. routeRimvioCommandMode — backward compat + verb enrichment ─ */

{
  const r = routeRimvioCommandMode({
    utterance: "오사카 여행 가고 싶어",
    activeContextId: null,
  });
  assert.equal(r.mode, "create");
  assert.ok(r.verb !== undefined, "verb field present");
}

{
  const r = routeRimvioCommandMode({
    utterance: "이 맥락 제주도로 옮겨줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.mode, "continue");
  assert.equal(r.reason, "context_command");
}

{
  const r = routeRimvioCommandMode({
    utterance: "이어줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.mode, "continue");
  assert.equal(r.verb, "resume");
}

{
  const r = routeRimvioCommandMode({
    utterance: "이 호텔 예약해줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.mode, "execute");
}

{
  const r = routeRimvioCommandMode({
    utterance: "바다 보이는 숙소 찾아줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.mode, "continue");
  assert.equal(r.reason, "active_domain_scout");
}

{
  const r = routeRimvioCommandMode({
    utterance: "알아서 해줘",
    activeContextId: "evt-osaka",
  });
  assert.equal(r.mode, "continue");
  assert.equal(r.reason, "delegation");
  assert.equal(r.verb, "auto");
}

console.log("ok — action-verb + target-resolver + verb-to-intent + route (all pass)");
