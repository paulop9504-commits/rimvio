#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { summarizeSelfLearning } from "../lib/dev/summarize-self-learning";
import type { LiveTurnLogEntry } from "../lib/self-learning/live-turn-types";

const now = new Date("2026-06-28T12:00:00.000Z");

const turns: LiveTurnLogEntry[] = [
  {
    type: "live_turn",
    stage: "output",
    timestamp: "2026-06-28T10:00:00.000Z",
    userMessage: "강남 맛집",
    assistantSummary: "ok",
    routing: { ai_intent: "food" },
    latencyMs: 400,
    source: "server",
  },
  {
    type: "live_turn",
    stage: "output",
    timestamp: "2026-06-27T10:00:00.000Z",
    userMessage: "아까 그거",
    assistantSummary: "miss",
    routing: { ai_intent: "recall" },
    isFailure: true,
    failureKind: "routing_error",
    latencyMs: 800,
    source: "server",
  },
  {
    type: "live_turn",
    stage: "input",
    timestamp: "2026-06-28T11:00:00.000Z",
    userMessage: "ignored",
    source: "client",
  },
];

const summary = summarizeSelfLearning({
  liveTurns: turns,
  feedbackEntries: [
    {
      type: "hit_run_feedback",
      timestamp: "2026-06-28T09:00:00.000Z",
      verdict: "up",
      messageId: "m1",
      userMessage: "good",
      assistantSummary: "ok",
    },
  ],
  now,
});

assert.equal(summary.outputTurnCount, 2);
assert.equal(summary.feedbackUp, 1);
assert.equal(summary.failureCount, 1);
assert.equal(summary.failureRatePct, 50);
assert.equal(summary.intentBars[0]?.label, "food");
assert.ok(summary.turnsByDay.length === 7);
assert.ok(
  summary.turnsByDay.some((bucket) => bucket.day === "2026-06-28" && bucket.count === 1),
);

console.log("test-self-learning-summary: ok");
