import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import { isExecutionApproval } from "@/lib/action-chat/commit-speech";
import { isCommitRejectMessage } from "@/lib/action-chat/commit-speech/classify-commit-speech";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import { composePeerSendMessage } from "@/lib/jarvis-peer-send/compose-peer-send-message";
import { buildInlineChatPeerSendWire } from "@/lib/jarvis-peer-send/inline-chat-peer-send";
import { commitJarvisPeerSend } from "@/lib/jarvis-peer-send/commit-jarvis-peer-send";
import {
  parseJarvisPeerSendIntent,
  isJarvisPeerSendIntent,
} from "@/lib/jarvis-peer-send/parse-jarvis-peer-send-intent";
import { resolvePeerSendTripShare } from "@/lib/jarvis-peer-send/resolve-peer-send-trip-share";
import {
  applyPeerSendConfirmToMessages,
  findPendingPeerSendMessage,
} from "@/lib/jarvis-peer-send/peer-send-message-state";
import {
  clearPendingJarvisPeerSend,
  readPendingJarvisPeerSend,
  setPendingJarvisPeerSend,
} from "@/lib/jarvis-peer-send/pending-jarvis-peer-send-store";
import { filterPeerContactsForTalk } from "@/lib/peer-chat/filter-talk-contacts";
import type { PeerContact } from "@/lib/context/peer-contact-types";

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

function resolveRecipient(
  recipientQuery: string,
): { contact: PeerContact | null; candidates: PeerContact[] } {
  const candidates = filterPeerContactsForTalk(recipientQuery);
  if (candidates.length === 1) {
    return { contact: candidates[0]!, candidates };
  }
  if (candidates.length === 0) {
    return { contact: null, candidates: [] };
  }
  const exact = candidates.find(
    (c) => c.displayName.trim().toLowerCase() === recipientQuery.toLowerCase(),
  );
  return { contact: exact ?? null, candidates };
}

function jarvisDraftIntro(displayName: string): string {
  return `${displayName} 님과의 메신저 창에 아래 메시지를 작성했습니다.`;
}

/** Build confirm card for NL peer send — no orchestrator. */
export function tryBuildJarvisPeerSendTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
  shareTripLabel?: string | null;
  tripScheduleLines?: readonly string[];
  contextEventId?: string | null;
}): ActionChatMessage[] | null {
  const parsed = parseJarvisPeerSendIntent(input.text);
  if (!parsed) {
    return null;
  }

  const userMessage = createChatMessage("user", parsed.rawUtterance, {
    chatAxis: input.chatAxis,
  });

  const { contact, candidates } = resolveRecipient(parsed.recipientQuery);
  if (candidates.length === 0) {
    return [
      userMessage,
      createChatMessage(
        "assistant",
        `"${parsed.recipientQuery}" 친구를 찾지 못했어요. @친추로 먼저 추가해 주세요.`,
      ),
    ];
  }

  const picked = contact ?? candidates[0]!;
  const displayName = picked.displayName.trim() || parsed.recipientQuery;

  const tripShare =
    parsed.shareTrip
      ? resolvePeerSendTripShare(input.contextEventId ?? null)
      : null;
  const shareTripLabel =
    parsed.shareTrip && input.shareTripLabel?.trim()
      ? input.shareTripLabel.trim()
      : parsed.shareTrip && tripShare?.shareTripLabel
        ? tripShare.shareTripLabel
        : parsed.shareTrip
          ? "여행"
          : null;
  const tripScheduleLines =
    parsed.shareTrip && input.tripScheduleLines?.length
      ? input.tripScheduleLines
      : parsed.shareTrip
        ? tripShare?.tripScheduleLines
        : undefined;

  const messageBody = composePeerSendMessage({
    recipientDisplayName: displayName,
    intentText: parsed.intentText,
    shareTripLabel,
    tripScheduleLines,
  });

  const draftId = crypto.randomUUID();
  const assistantId = crypto.randomUUID();
  const wire = buildInlineChatPeerSendWire({
    draftId,
    recipientQuery: parsed.recipientQuery,
    recipientDisplayName: displayName,
    peerThreadId: picked.peerThreadId,
    messageBody,
    intentText: parsed.intentText,
    shareTrip: parsed.shareTrip,
    shareTripLabel,
    tripScheduleLines,
    disambiguation: contact ? undefined : candidates,
  });

  setPendingJarvisPeerSend({ messageId: assistantId, wire });

  return [
    userMessage,
    createChatMessage("assistant", jarvisDraftIntro(displayName), {
      id: assistantId,
      inlineChatPeerSend: wire,
      metadata: mentionOrchestratorMetadata({
        mention_feature: "peer_send",
        sourceRef: "jarvis:peer_send",
      }),
    }),
  ];
}

/** Speech / resume — commit pending peer send. Returns messages patch or null. */
export async function tryCommitJarvisPeerSendTurn(input: {
  text: string;
  messages: readonly ActionChatMessage[];
}): Promise<ActionChatMessage[] | null> {
  const trimmed = input.text.trim();
  if (!trimmed || trimmed.startsWith("@")) {
    return null;
  }

  const pendingFromStore = readPendingJarvisPeerSend();
  const pendingFromMessages = findPendingPeerSendMessage(input.messages);
  const pending = pendingFromStore ?? pendingFromMessages;
  if (!pending) {
    return null;
  }

  if (isCommitRejectMessage(trimmed)) {
    clearPendingJarvisPeerSend();
    return applyPeerSendConfirmToMessages(
      input.messages,
      pending.messageId,
      { status: "cancelled" },
      "전송을 취소했어요.",
    );
  }

  if (!isExecutionApproval(trimmed)) {
    return null;
  }

  const message = input.messages.find((m) => m.id === pending.messageId);
  const wire = message?.inlineChatPeerSend ?? pending.wire;
  if (!wire || wire.status !== "pending") {
    return null;
  }

  const result = await commitJarvisPeerSend(wire);
  if (!result.ok) {
    return applyPeerSendConfirmToMessages(
      input.messages,
      pending.messageId,
      { status: "failed", errorKo: result.errorKo },
      result.errorKo,
    );
  }

  return applyPeerSendConfirmToMessages(
    input.messages,
    pending.messageId,
    { status: "sent", sentMessageId: result.messageId },
    "전송 완료했습니다. 메신저 탭에서 확인하실 수 있습니다.",
  );
}

export { isJarvisPeerSendIntent };
