import assert from "node:assert/strict";
import {
  buildBridgeContextThreadId,
  isBridgeContextThreadId,
} from "../lib/peer-chat/bridge-context-thread";
import { isGroupThreadId } from "../lib/peer-chat/group-thread";

const eventA = "plan:상하이:1705070220000";
const eventB = "plan:도쿄:1705070220001";

const threadA1 = buildBridgeContextThreadId(eventA);
const threadA2 = buildBridgeContextThreadId(eventA);
const threadB = buildBridgeContextThreadId(eventB);

assert.equal(threadA1, threadA2);
assert.notEqual(threadA1, threadB);
assert.ok(isBridgeContextThreadId(threadA1));
assert.ok(isGroupThreadId(threadA1));
assert.ok(threadA1.startsWith("peer-bridge-"));

console.log("test-bridge-context-thread: ok");
