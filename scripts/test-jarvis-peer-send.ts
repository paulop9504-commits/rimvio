import assert from "node:assert/strict";
import {
  normalizeSendInternalMessageToolInput,
  SEND_INTERNAL_MESSAGE_TOOL,
  SEND_INTERNAL_MESSAGE_TOOL_NAME,
} from "../lib/agent-tools/send-internal-message-tool";
import { composePeerSendMessage } from "../lib/jarvis-peer-send/compose-peer-send-message";
import {
  isJarvisPeerSendIntent,
  normalizeRecipientQuery,
  parseJarvisPeerSendIntent,
} from "../lib/jarvis-peer-send/parse-jarvis-peer-send-intent";

{
  const intent = parseJarvisPeerSendIntent(
    "동준이한테 내일모레 강남역 7시에서 보자고 메신저 보내줘",
  );
  assert.ok(intent);
  assert.equal(normalizeRecipientQuery("동준이"), "동준");
  assert.equal(intent!.recipientQuery, "동준");
  assert.match(intent!.intentText, /강남역/);
  assert.equal(isJarvisPeerSendIntent(intent!.rawUtterance), true);
}

{
  const body = composePeerSendMessage({
    recipientDisplayName: "동준",
    intentText: "내일모레 강남역 7시에서 보자",
  });
  assert.match(body, /동준/);
  assert.match(body, /강남역/);
  assert.match(body, /7시/);
}

{
  const share = parseJarvisPeerSendIntent("민수에게 제주 여행 일정 공유해줘");
  assert.ok(share);
  assert.equal(share!.shareTrip, true);
}

{
  const body = composePeerSendMessage({
    recipientDisplayName: "민수",
    intentText: "일정 확인해줘",
    shareTripLabel: "오사카 여행",
    tripScheduleLines: ["Day1 KIX → 난바", "Day2 USJ"],
  });
  assert.match(body, /오사카 여행/);
  assert.match(body, /Day1 KIX/);
  assert.match(body, /Day2 USJ/);
  assert.match(body, /민수/);
}

{
  assert.equal(SEND_INTERNAL_MESSAGE_TOOL.name, SEND_INTERNAL_MESSAGE_TOOL_NAME);
  const tool = normalizeSendInternalMessageToolInput({
    recipient_name: "동준",
    message_content: "내일모레 강남역 7시",
    share_trip_label: "오사카 여행",
  });
  assert.equal(tool.recipientQuery, "동준");
  assert.match(tool.messageBody, /동준/);
  assert.match(tool.messageBody, /오사카 여행/);
}

console.log("OK — jarvis-peer-send");
