import assert from "node:assert/strict";
import {
  buildFriendAddQrUrl,
  isFriendAddUserId,
  parseFriendAddQrPayload,
} from "../lib/peer-chat/friend-add-qr-url";

const uid = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
const url = buildFriendAddQrUrl({ userId: uid, origin: "https://rimvio.com" });

assert.equal(url, `https://rimvio.com/peers/add?uid=${uid}`);
assert.ok(isFriendAddUserId(uid));
assert.equal(parseFriendAddQrPayload(url), uid);
assert.equal(
  parseFriendAddQrPayload(`https://rimvio.com/peers/add?rimvio=test_user`),
  "test_user",
);

console.log("--- friend add qr url ---");
console.log("ok");
