import assert from "node:assert/strict";
import {
  isEndPeerTalkMentionInput,
  tryBuildMentionEndPeerTalkTurn,
} from "../lib/action-chat/mention-peer-talk-end/commit-mention-end-peer-talk-turn";
import { getFeedPeerTalkSession, setFeedPeerTalkSession } from "../lib/action-chat/feed-peer-talk/feed-peer-talk-session";
import type { ActionChatMessage } from "../lib/action-chat/orchestrator-types";

assert.ok(isEndPeerTalkMentionInput("@대화끝"));
assert.ok(isEndPeerTalkMentionInput("@톡끝"));
assert.ok(!isEndPeerTalkMentionInput("@톡 monica"));

let store: ActionChatMessage[] = [
  {
    id: "t1",
    role: "assistant",
    text: "",
    createdAt: new Date().toISOString(),
    feedPeerTalkThread: {
      peerThreadId: "peer-dm-a__b",
      displayName: "이미형",
      messages: [],
      historyEndIndex: -1,
      promptLine: "이미형님과 대화를 시작하세요",
    },
  },
];

setFeedPeerTalkSession({ peerThreadId: "peer-dm-a__b", displayName: "이미형" });

const turn = tryBuildMentionEndPeerTalkTurn(
  { text: "@대화끝" },
  {
    readMessages: () => store,
    persist: (next) => {
      store = next;
    },
  },
);

assert.ok(turn);
assert.equal(getFeedPeerTalkSession(), null);
assert.equal(store[0]!.feedPeerTalkThread!.closed, true);

console.log("test-mention-end-peer-talk: ok");
