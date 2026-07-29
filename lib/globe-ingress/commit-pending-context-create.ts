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
import { runRealityIngressPipeline } from "@/lib/reality-pipeline";
import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import {
  runWorkspaceIntentContinuum,
  seedTravelLodgingForContinuum,
} from "@/lib/workspace-kind/run-workspace-intent-continuum";
import { offerContextReferenceChips } from "@/lib/context-reference/offer-context-reference-chips";

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

  // Seed Execution Inbox (결재함) — prepare only; human CEO Sign later.
  const destination =
    draft.travelSlots?.destination?.trim() ||
    event.place?.trim() ||
    event.title.replace(/\s*여행$/u, "").trim() ||
    "여행지";
  runRealityIngressPipeline({
    contextEventId: event.id,
    utterance: draft.utterance,
    contextLabelKo: event.title,
    destinationLabelKo: destination,
    seedExecutionInbox: true,
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

  // One tool: Context created → Workspace prep → Focus → booking path seed.
  runWorkspaceIntentContinuum({
    utterance: draft.utterance,
    graphId: draft.graphId,
    contextEventId: event.id,
    createIfMissing: false,
    skipChatEcho: false,
  });

  void seedTravelLodgingForContinuum({
    contextEventId: event.id,
    utterance: draft.utterance,
  });

  input.handlers.onGlobeIngressCompiled?.({
    compiled: draft.compiled,
    eventId: event.id,
  });
  input.handlers.onAttached?.(event.id);

  // ADR-030 — optional Reference Links only (never auto-merge).
  offerContextReferenceChips({
    targetEventId: event.id,
    utterance: draft.utterance,
  });

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
