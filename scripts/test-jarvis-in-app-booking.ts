/**
 * Jarvis in-app booking — parse · resolve · dispatch · commit.
 * Run: npx tsx scripts/test-jarvis-in-app-booking.ts
 */

import assert from "node:assert/strict";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import {
  isInAppBookingIntent,
  parseInAppBookingIntent,
} from "../lib/jarvis-in-app-booking/parse-in-app-booking-intent";
import {
  resolveBookingLodging,
  searchBookingLodgingCandidates,
} from "../lib/jarvis-in-app-booking/resolve-booking-lodging";
import {
  tryBuildInAppBookingTurn,
  tryCommitInAppBookingTurn,
} from "../lib/jarvis-in-app-booking/dispatch-in-app-booking-turn";
import { commitInAppBooking } from "../lib/jarvis-in-app-booking/commit-in-app-booking";
import { buildInlineChatBookingDraftWire } from "../lib/jarvis-in-app-booking/inline-chat-booking-draft";

clearPreparedRealityOperations();

{
  const intent = parseInAppBookingIntent("APA 난바 예약해줘");
  assert.ok(intent);
  assert.equal(intent!.placeQuery, "APA 난바");
  assert.equal(isInAppBookingIntent("APA 난바 예약해줘"), true);
  assert.equal(parseInAppBookingIntent("오사카 숙소 찾아줘"), null);
}

{
  const apa = resolveBookingLodging("APA 난바");
  assert.ok(apa);
  assert.equal(apa!.id, "lodging:apa-namba");

  const novotel = resolveBookingLodging("강남 노보텔");
  assert.ok(novotel);
  assert.match(novotel!.labelKo, /노보텔/);

  const candidates = searchBookingLodgingCandidates({ query: "APA", limit: 2 });
  assert.ok(candidates.length >= 1);
}

{
  const turn = tryBuildInAppBookingTurn({
    text: "APA 난바 예약해줘",
    contextEventId: "ctx-test-booking-1",
    contextLabelKo: "오사카 여행",
  });
  assert.ok(turn);
  assert.equal(turn!.length, 2);
  const assistant = turn![1]!;
  assert.ok(assistant.inlineChatBookingDraft);
  assert.equal(assistant.inlineChatBookingDraft!.placeName, "APA 난바");
  assert.equal(assistant.inlineChatBookingDraft!.status, "pending");
}

{
  const noCtx = tryBuildInAppBookingTurn({
    text: "APA 난바 예약해줘",
    contextEventId: null,
  });
  assert.ok(noCtx);
  assert.match(noCtx![1]!.text, /맥락/);
}

{
  const wire = buildInlineChatBookingDraftWire({
    draftId: "draft-1",
    placeQuery: "APA 난바",
    placeId: "lodging:apa-namba",
    placeName: "APA 난바",
    cityId: "osaka",
    lat: 34.6654,
    lng: 135.5019,
    amountLabel: "₩12만/박",
    contextEventId: "ctx-test-booking-commit",
    contextLabelKo: "오사카",
  });

  const result = commitInAppBooking(wire);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.operationId.trim().length > 0);
  }
}

{
  const turn = tryBuildInAppBookingTurn({
    text: "APA 우메다 예약해줘",
    contextEventId: "ctx-test-booking-speech",
  });
  assert.ok(turn);
  const messages = turn!;
  const committed = tryCommitInAppBookingTurn({
    text: "확인",
    messages,
  });
  assert.ok(committed);
  const assistant = committed!.find((m) => m.inlineChatBookingDraft);
  assert.ok(assistant?.inlineChatBookingDraft);
  assert.equal(assistant!.inlineChatBookingDraft!.status, "prepared");
}

console.log("test-jarvis-in-app-booking: ok");
