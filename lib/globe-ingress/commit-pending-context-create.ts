/**
 * 「생성」승인 → Reality Commit: EventCandidate + pin + feed + assistant.
 */

import type { ContextRunEffectHandlers } from "@/lib/context-run/ingress-types";
import { ensureTripContextEvent } from "@/lib/experience-run/ensure-trip-context-event";
import { syncGlobeIngressCompileToFeed } from "@/lib/context-run/sync-globe-ingress-to-feed";
import { buildTripIngressCreatedChatAssistantLine } from "@/lib/globe/trip-situation-router/build-trip-flow-chat-lines";
import { appendGlobeChatTextMessage } from "@/lib/globe/chat/globe-chat-session-store";
import {
  clearPendingContextCreate,
  readPendingContextCreate,
  type PendingContextCreateDraft,
} from "@/lib/globe-ingress/pending-context-create-store";
import { buildContextCreateProgressLines } from "@/lib/globe-ingress/format-pending-context-create-preview";
import { syncGlobeIngressCreatingProgressToFeed } from "@/lib/context-run/sync-globe-ingress-to-feed";
import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";

export type CommitPendingContextCreateResult = {
  readonly event: EventCandidate;
  readonly compiled: GlobeIngressCompileResult;
  readonly draft: PendingContextCreateDraft;
};

export function commitPendingContextCreate(input: {
  graphId: string;
  handlers: ContextRunEffectHandlers;
}): CommitPendingContextCreateResult | null {
  const draft = readPendingContextCreate(input.graphId);
  if (!draft) {
    return null;
  }

  const progressLines = buildContextCreateProgressLines(draft);
  for (const line of progressLines) {
    appendGlobeChatTextMessage({
      graphId: draft.graphId,
      role: "assistant",
      text: line,
    });
  }

  syncGlobeIngressCreatingProgressToFeed(draft.compiled, draft.utterance);

  const event = ensureTripContextEvent({
    message: draft.utterance,
    travelSlots: draft.travelSlots,
    profile: draft.profile,
  });

  syncGlobeIngressCompileToFeed(draft.compiled, draft.utterance);

  const assistantText = buildTripIngressCreatedChatAssistantLine({
    eventTitle: event.title,
    blueprint: draft.compiled.blueprint,
  });
  appendGlobeChatTextMessage({
    graphId: draft.graphId,
    role: "assistant",
    text: `${copy.globe.contextAnchor.committedHeadline}\n${assistantText}`,
  });

  input.handlers.onGlobeIngressCompiled?.({
    compiled: draft.compiled,
    eventId: event.id,
  });
  input.handlers.onAttached?.(event.id);

  clearPendingContextCreate(draft.graphId);
  return { event, compiled: draft.compiled, draft };
}

export function cancelPendingContextCreate(input: {
  graphId: string;
}): boolean {
  const draft = readPendingContextCreate(input.graphId);
  if (!draft) {
    return false;
  }
  clearPendingContextCreate(draft.graphId);
  appendGlobeChatTextMessage({
    graphId: draft.graphId,
    role: "assistant",
    text: copy.globe.contextAnchor.cancelled,
  });
  return true;
}
