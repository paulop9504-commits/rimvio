/**
 * Hub Agent conversational response regression tests.
 */

import assert from "node:assert/strict";
import { classifyIntent, runConversationGate } from "@/lib/agent/conversation";

function mustNotInclude(text: string, forbidden: readonly string[]) {
  for (const word of forbidden) {
    assert.ok(!text.includes(word), `must not include "${word}" in: ${text.slice(0, 80)}`);
  }
}

function main() {
  const forbidden = ["capability ·", "Tool Gateway", "Workspace Patch", "Used Market Platform에서 capability"];

  // 1. Greeting
  const hi = runConversationGate({ utterance: "ㅎㅇ" });
  assert.equal(hi.intent, "chat");
  assert.equal(hi.executable, false);
  mustNotInclude(hi.responseKo ?? "", forbidden);
  assert.match(hi.responseKo ?? "", /안녕/);

  // 2. Infrastructure explore — global, no platform name
  const infra = runConversationGate({
    utterance: "어떤 인프라를 만들 수 있어?",
    context: { platformName: "Used Market Platform", currentPlatform: "Used Market Platform" },
  });
  assert.equal(infra.intent, "question");
  mustNotInclude(infra.responseKo ?? "", ["Used Market", "capability ·"]);
  assert.match(infra.responseKo ?? "", /데이터|회원|파일/);
  assert.ok((infra.suggestedActions?.length ?? 0) >= 5, "action cards");

  // 3. DB availability — explain, not execute
  assert.equal(classifyIntent("DB 만들 수 있어?").intent, "question");
  const db = runConversationGate({ utterance: "DB 만들 수 있어?" });
  assert.equal(db.executable, false);
  assert.match(db.responseKo ?? "", /데이터|테이블|가능/);

  // 4. GitHub availability vs execution
  assert.equal(classifyIntent("GitHub 연결할 수 있어?").intent, "question");
  assert.equal(classifyIntent("GitHub 연결해줘").intent, "connect");
  const ghQ = runConversationGate({ utterance: "GitHub 연결할 수 있어?" });
  assert.equal(ghQ.executable, false);
  assert.match(ghQ.responseKo ?? "", /GitHub|연결/);

  // 5. Status inspect executes
  const status = runConversationGate({ utterance: "현재 상태 확인해줘" });
  assert.equal(status.intent, "inspect");
  assert.equal(status.executable, true);

  // 6. Test executes
  const test = runConversationGate({ utterance: "테스트 돌려줘" });
  assert.equal(test.intent, "test");
  assert.equal(test.executable, true);

  // 7. Used market planning
  const market = runConversationGate({ utterance: "중고거래 플랫폼 만들어줘" });
  assert.match(market.responseKo ?? market.currentGoal ?? "", /중고|회원|상품|구성|만들/);

  // 8. Vague infra
  const vague = runConversationGate({ utterance: "인프라 만들어줘" });
  assert.equal(vague.executable, false);
  assert.match(vague.responseKo ?? "", /어떤 서비스|예:/);

  // 9. Context-aware greeting in workspace
  const hiApp = runConversationGate({
    utterance: "ㅎㅇ",
    context: { platformName: "우리동네 배달" },
  });
  assert.match(hiApp.responseKo ?? "", /우리동네 배달/);

  // 10. No stale internal jargon on generic question
  const what = runConversationGate({
    utterance: "뭐 할 수 있어?",
    context: { platformName: "GachaStay" },
  });
  mustNotInclude(what.responseKo ?? "", forbidden);
  assert.ok((what.suggestedActions?.length ?? 0) > 0);

  console.log("test-hub-agent-conversation: ok");
}

main();
