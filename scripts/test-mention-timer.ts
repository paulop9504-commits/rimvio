#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { tryBuildMentionTimerTurn } from "../lib/action-chat/mention-timer/commit-mention-timer-turn";
import {
  buildInlineChatTimerWire,
  formatMentionTimerLabel,
  parseMentionTimerDuration,
} from "../lib/action-chat/mention-timer/inline-chat-timer";
import { normalizeAtMentionInput, parseCommandInput } from "../lib/command-os/parse-command-input";
import { parseActionMention } from "../lib/event-kernel/action-contracts/parse-action-mention";

assert.equal(parseMentionTimerDuration("5분"), 5 * 60 * 1000);
assert.equal(parseMentionTimerDuration("3분"), 3 * 60 * 1000);
assert.equal(parseMentionTimerDuration("90초"), 90 * 1000);

const mention = parseActionMention("@타이머 3분");
assert.ok(mention);
assert.equal(mention!.feature.featureId, "timer");

const turn = tryBuildMentionTimerTurn({ text: "@타이머 3분" });
assert.ok(turn);
assert.equal(turn!.length, 2);
assert.ok(turn![1]!.inlineChatTimer);

const bareTurn = tryBuildMentionTimerTurn({ text: "@타이머" });
assert.ok(bareTurn);
assert.equal(bareTurn!.length, 2);
assert.match(bareTurn![1]!.text, /몇 분 타이머/);
assert.equal(bareTurn![1]!.inlineChatTimer, undefined);

assert.ok(parseCommandInput(normalizeAtMentionInput("＠타이머 3분")));
assert.ok(parseCommandInput("@타이머3분"));

const wire = buildInlineChatTimerWire(3 * 60 * 1000, Date.parse("2026-06-01T10:00:00.000Z"));
assert.equal(wire.label, formatMentionTimerLabel(3 * 60 * 1000));

console.log("test-mention-timer: ok");
