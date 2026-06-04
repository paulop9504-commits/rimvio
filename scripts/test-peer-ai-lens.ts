#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { PeerMessage } from "../lib/context/peer-message-types";
import { analyzePeerThreadForLens } from "../lib/peer-chat/ai-lens/rank-lens-bubbles";
import { parseLensDateFromText } from "../lib/peer-chat/ai-lens/parse-lens-date";
import { resetLensUserHistoryForTests } from "../lib/peer-chat/ai-lens/lens-user-history";

function msg(
  id: string,
  author: PeerMessage["author"],
  body: string,
): PeerMessage {
  return {
    id,
    peerThreadId: "peer-dm-a__b",
    author,
    body,
    sentAt: new Date().toISOString(),
    messageType: "human",
  };
}

resetLensUserHistoryForTests([
  { actionType: "navigate", shown: 20, clicked: 18 },
  { actionType: "transfer", shown: 10, clicked: 7 },
  { actionType: "schedule", shown: 10, clicked: 1 },
]);

const ex1 = analyzePeerThreadForLens([
  msg("1", "peer", "7시에 치킨집에서 보자"),
]);
assert.ok(ex1.candidates.some((c) => c.label.includes("일정")));
assert.equal(ex1.candidates.length <= 3, true);

const ex2 = analyzePeerThreadForLens([
  msg("1", "me", "어디 치킨집?"),
  msg("2", "peer", "둔산동 멕시카나"),
]);
assert.ok(ex2.candidates.some((c) => c.actionType === "navigate"));
assert.equal(ex2.anchorMessageId, "2");

const refWed = new Date(2026, 5, 3);
assert.equal(parseLensDateFromText("이번주 금요일", refWed)?.dateKey, "2026-06-05");
assert.equal(parseLensDateFromText("내일", refWed)?.dateKey, "2026-06-04");
assert.equal(parseLensDateFromText("6월 10일", refWed)?.dateKey, "2026-06-10");

const ex3 = analyzePeerThreadForLens(
  [msg("1", "peer", "이번주 금요일 CGV 갈래?")],
  refWed,
);
const movie = ex3.candidates.find((c) => c.actionType === "movie_schedule");
assert.ok(movie);
assert.ok(
  movie!.payload?.datetime?.startsWith("2026-06-05"),
  "movie schedule should use parsed Friday",
);

const ex4 = analyzePeerThreadForLens([
  msg("1", "peer", "내 계좌로 보내줘"),
]);
assert.ok(ex4.candidates.some((c) => c.actionType === "transfer"));

const ex5 = analyzePeerThreadForLens([
  msg("1", "peer", "이 문서 확인해줘 https://example.com/doc"),
]);
assert.ok(ex5.candidates.some((c) => c.actionType === "open_link"));

const ranked = analyzePeerThreadForLens([
  msg("1", "peer", "둔산동 멕시카나"),
  msg("2", "me", "ㅇㅋ"),
]);
const nav = ranked.candidates.find((c) => c.actionType === "navigate");
assert.ok(nav);
assert.ok(
  ranked.candidates[0]!.actionType === "navigate" ||
    nav.score >= ranked.candidates[ranked.candidates.length - 1]!.score,
  "navigate should rank high with history",
);

console.log("test-peer-ai-lens: ok");
