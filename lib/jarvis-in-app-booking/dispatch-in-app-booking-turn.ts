import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import { isExecutionApproval } from "@/lib/action-chat/commit-speech";
import { isCommitRejectMessage } from "@/lib/action-chat/commit-speech/classify-commit-speech";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import { commitInAppBooking } from "@/lib/jarvis-in-app-booking/commit-in-app-booking";
import { buildInlineChatBookingDraftWire } from "@/lib/jarvis-in-app-booking/inline-chat-booking-draft";
import {
  applyBookingDraftConfirmToMessages,
  findPendingBookingDraftMessage,
} from "@/lib/jarvis-in-app-booking/booking-draft-message-state";
import {
  parseInAppBookingIntent,
  isInAppBookingIntent,
} from "@/lib/jarvis-in-app-booking/parse-in-app-booking-intent";
import {
  clearPendingInAppBooking,
  readPendingInAppBooking,
  setPendingInAppBooking,
} from "@/lib/jarvis-in-app-booking/pending-in-app-booking-store";
import {
  resolveBookingLodging,
  searchBookingLodgingCandidates,
} from "@/lib/jarvis-in-app-booking/resolve-booking-lodging";

function createChatMessage(
  role: ActionChatMessage["role"],
  text: string,
  extra?: Partial<ActionChatMessage>,
): ActionChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

function bookingDraftIntro(placeName: string): string {
  return `${placeName} 예약 준비를 결재함에 담을게요.`;
}

/** Build confirm card for NL in-app booking — no orchestrator. */
export function tryBuildInAppBookingTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
  contextEventId?: string | null;
  contextLabelKo?: string | null;
}): ActionChatMessage[] | null {
  const parsed = parseInAppBookingIntent(input.text);
  if (!parsed) {
    return null;
  }

  const ctx = input.contextEventId?.trim() ?? "";
  if (!ctx) {
    return [
      createChatMessage("user", parsed.rawUtterance, { chatAxis: input.chatAxis }),
      createChatMessage(
        "assistant",
        "앱 예약은 여행 맥락(Globe)이 필요해요. 여행을 연 뒤 다시 말씀해 주세요.",
      ),
    ];
  }

  const resolved = resolveBookingLodging(parsed.placeQuery);
  const candidates = resolved
    ? [resolved]
    : searchBookingLodgingCandidates({ query: parsed.placeQuery, limit: 4 });

  if (candidates.length === 0) {
    return [
      createChatMessage("user", parsed.rawUtterance, { chatAxis: input.chatAxis }),
      createChatMessage(
        "assistant",
        `"${parsed.placeQuery}" 숙소를 찾지 못했어요. 예: APA 난바 예약해줘`,
      ),
    ];
  }

  const picked = candidates[0]!;
  const userMessage = createChatMessage("user", parsed.rawUtterance, {
    chatAxis: input.chatAxis,
  });

  const draftId = crypto.randomUUID();
  const assistantId = crypto.randomUUID();
  const wire = buildInlineChatBookingDraftWire({
    draftId,
    placeQuery: parsed.placeQuery,
    placeId: picked.id,
    placeName: picked.labelKo,
    cityId: picked.cityId,
    lat: picked.lat,
    lng: picked.lng,
    amountLabel: picked.amountLabel ?? null,
    contextEventId: ctx,
    contextLabelKo: input.contextLabelKo ?? null,
    disambiguation: candidates.length > 1 ? candidates : undefined,
  });

  setPendingInAppBooking({ messageId: assistantId, wire });

  return [
    userMessage,
    createChatMessage("assistant", bookingDraftIntro(picked.labelKo), {
      id: assistantId,
      inlineChatBookingDraft: wire,
      metadata: mentionOrchestratorMetadata({
        mention_feature: "in_app_booking",
        sourceRef: "jarvis:in_app_booking",
      }),
    }),
  ];
}

/** Speech / resume — commit pending booking draft. Returns messages patch or null. */
export function tryCommitInAppBookingTurn(input: {
  text: string;
  messages: readonly ActionChatMessage[];
}): ActionChatMessage[] | null {
  const trimmed = input.text.trim();
  if (!trimmed || trimmed.startsWith("@")) {
    return null;
  }

  const pendingFromStore = readPendingInAppBooking();
  const pendingFromMessages = findPendingBookingDraftMessage(input.messages);
  const pending = pendingFromStore ?? pendingFromMessages;
  if (!pending) {
    return null;
  }

  if (isCommitRejectMessage(trimmed)) {
    clearPendingInAppBooking();
    return applyBookingDraftConfirmToMessages(
      input.messages,
      pending.messageId,
      { status: "cancelled" },
      "예약 준비를 취소했어요.",
    );
  }

  if (!isExecutionApproval(trimmed)) {
    return null;
  }

  const message = input.messages.find((m) => m.id === pending.messageId);
  const wire = message?.inlineChatBookingDraft ?? pending.wire;
  if (!wire || wire.status !== "pending") {
    return null;
  }

  const result = commitInAppBooking(wire);
  if (!result.ok) {
    return applyBookingDraftConfirmToMessages(
      input.messages,
      pending.messageId,
      { status: "failed", errorKo: result.errorKo },
      result.errorKo,
    );
  }

  return applyBookingDraftConfirmToMessages(
    input.messages,
    pending.messageId,
    { status: "prepared", operationId: result.operationId },
    "결재함에 담았어요. Field에서 확인·승인할 수 있습니다.",
  );
}

export { isInAppBookingIntent };
