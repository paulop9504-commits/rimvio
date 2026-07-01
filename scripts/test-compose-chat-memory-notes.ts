import assert from "node:assert/strict";
import { buildComposeChatMemoryNotesKo } from "../lib/portal/compose-chat/build-compose-chat-memory-notes";
import type { EventCandidate } from "../lib/events/event-candidate";

function event(partial: Partial<EventCandidate> & Pick<EventCandidate, "id" | "title">): EventCandidate {
  const now = new Date().toISOString();
  return {
    category: "custom",
    source: "message",
    lifecycle: "draft",
    confidence: 0.8,
    lifecycleUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function main() {
  const events = [
    event({
      id: "e1",
      title: "아이폰 15 프로 구매",
      place: "강남",
      updatedAt: new Date().toISOString(),
    }),
    event({
      id: "e2",
      title: "캠핑용품 장만",
      place: "용산",
      updatedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    }),
    event({
      id: "e3",
      title: "노트북 판매 등록",
      updatedAt: new Date(Date.now() - 120 * 86_400_000).toISOString(),
    }),
  ];

  const phoneNotes = buildComposeChatMemoryNotesKo({
    events,
    contextText: "핸드폰 팔까 생각 중",
  });
  assert.ok(phoneNotes?.includes("아이폰"));
  assert.equal(phoneNotes?.includes("노트북"), false);

  const unrelated = buildComposeChatMemoryNotesKo({
    events,
    contextText: "안녕",
  });
  assert.equal(unrelated, null);

  console.log("test-compose-chat-memory-notes: PASS");
}

main();
