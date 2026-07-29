/**
 * Propose / commit Context Anchor moves (NL + drag).
 */

import {
  resolveTripContextAnchor,
  resolveTripContextAnchorAsync,
} from "@/lib/experience-run/resolve-trip-context-anchor";
import { relocateGlobeContextPin } from "@/lib/globe/relocate-globe-context-pin";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  appendGlobeChatSlotPromptMessage,
  appendGlobeChatTextMessage,
} from "@/lib/globe/chat/globe-chat-session-store";
import { copy } from "@/lib/copy/human-ko";
import {
  clearPendingContextAnchorMove,
  readPendingContextAnchorMove,
  writePendingContextAnchorMove,
} from "@/lib/globe-ingress/pending-context-anchor-move-store";
import {
  isContextAnchorMoveApprove,
  isContextAnchorMoveCancel,
  parseContextAnchorMoveTarget,
} from "@/lib/globe-ingress/detect-context-anchor-move";
import type { EventCandidate } from "@/lib/events/event-candidate";

export const CONTEXT_ANCHOR_MOVE_SLOT_ID = "context_anchor_move";
export const CONTEXT_ANCHOR_MOVE_CONFIRM = "confirm";
export const CONTEXT_ANCHOR_MOVE_CANCEL = "cancel";

export async function proposeContextAnchorMoveFromNl(input: {
  graphId: string;
  eventId: string;
  utterance: string;
}): Promise<"offered" | "unresolved" | "missing_event"> {
  const event = findLifeEventCandidate(input.eventId);
  if (!event) {
    return "missing_event";
  }
  const targetLabel = parseContextAnchorMoveTarget(input.utterance);
  if (!targetLabel) {
    appendGlobeChatTextMessage({
      graphId: input.graphId,
      role: "assistant",
      text: copy.globe.contextAnchor.moveUnresolved,
    });
    return "unresolved";
  }
  const current = resolveEventGlobeCoords(event);
  const fromLabel =
    current.placeLabel.trim() ||
    event.place?.trim() ||
    event.title.trim() ||
    "현재";

  // Sync dictionaries first, then open-world Nominatim — never fake-move to current pin.
  const resolved =
    resolveTripContextAnchor(targetLabel) ??
    (await resolveTripContextAnchorAsync(targetLabel));
  if (
    !resolved ||
    !Number.isFinite(resolved.lat) ||
    !Number.isFinite(resolved.lng)
  ) {
    appendGlobeChatTextMessage({
      graphId: input.graphId,
      role: "assistant",
      text: copy.globe.contextAnchor.moveUnresolved,
    });
    return "unresolved";
  }

  const toLat = resolved.lat;
  const toLng = resolved.lng;
  const toLabel = resolved.placeLabel;

  writePendingContextAnchorMove({
    graphId: input.graphId,
    eventId: event.id,
    fromLabel,
    toLabel,
    toLat,
    toLng,
    utterance: input.utterance.trim(),
    createdAtIso: new Date().toISOString(),
  });

  appendGlobeChatTextMessage({
    graphId: input.graphId,
    role: "assistant",
    text: copy.globe.contextAnchor.moveConfirm(fromLabel, toLabel),
  });
  appendGlobeChatSlotPromptMessage({
    graphId: input.graphId,
    text: copy.globe.contextAnchor.moveChipPrompt,
    clarifyKind: "context_anchor_move",
    slotId: CONTEXT_ANCHOR_MOVE_SLOT_ID,
    choices: [
      {
        id: CONTEXT_ANCHOR_MOVE_CONFIRM,
        labelKo: copy.globe.contextAnchor.moveConfirmCta,
      },
      {
        id: CONTEXT_ANCHOR_MOVE_CANCEL,
        labelKo: copy.globe.contextAnchor.moveCancelCta,
      },
    ],
  });
  return "offered";
}

/** Map drag — stage confirm without writing SSOT. */
export function proposeContextAnchorMoveFromDrag(input: {
  graphId: string;
  eventId: string;
  lat: number;
  lng: number;
  placeLabel?: string | null;
}): "offered" | "missing_event" {
  const event = findLifeEventCandidate(input.eventId);
  if (!event) {
    return "missing_event";
  }
  const current = resolveEventGlobeCoords(event);
  const fromLabel =
    current.placeLabel.trim() ||
    event.place?.trim() ||
    event.title.trim() ||
    "현재";
  const toLabel =
    input.placeLabel?.trim() ||
    `직접 선택한 위치 (${input.lat.toFixed(3)}, ${input.lng.toFixed(3)})`;

  writePendingContextAnchorMove({
    graphId: input.graphId,
    eventId: event.id,
    fromLabel,
    toLabel,
    toLat: input.lat,
    toLng: input.lng,
    utterance: "pin_drag",
    createdAtIso: new Date().toISOString(),
  });

  appendGlobeChatTextMessage({
    graphId: input.graphId,
    role: "assistant",
    text: copy.globe.contextAnchor.moveConfirm(fromLabel, toLabel),
  });
  appendGlobeChatSlotPromptMessage({
    graphId: input.graphId,
    text: copy.globe.contextAnchor.moveChipPrompt,
    clarifyKind: "context_anchor_move",
    slotId: CONTEXT_ANCHOR_MOVE_SLOT_ID,
    choices: [
      {
        id: CONTEXT_ANCHOR_MOVE_CONFIRM,
        labelKo: copy.globe.contextAnchor.moveConfirmCta,
      },
      {
        id: CONTEXT_ANCHOR_MOVE_CANCEL,
        labelKo: copy.globe.contextAnchor.moveCancelCta,
      },
    ],
  });
  return "offered";
}

export function tryResolvePendingContextAnchorMoveReply(input: {
  graphId: string;
  text: string;
}):
  | { kind: "committed"; event: EventCandidate }
  | { kind: "cancelled" }
  | { kind: "none" } {
  const pending = readPendingContextAnchorMove(input.graphId);
  if (!pending) {
    return { kind: "none" };
  }
  const text = input.text.trim();
  if (
    isContextAnchorMoveCancel(text) ||
    text === CONTEXT_ANCHOR_MOVE_CANCEL
  ) {
    clearPendingContextAnchorMove(input.graphId);
    appendGlobeChatTextMessage({
      graphId: input.graphId,
      role: "assistant",
      text: copy.globe.contextAnchor.moveCancelled,
    });
    return { kind: "cancelled" };
  }
  if (
    !isContextAnchorMoveApprove(text) &&
    text !== CONTEXT_ANCHOR_MOVE_CONFIRM
  ) {
    return { kind: "none" };
  }
  const event = relocateGlobeContextPin({
    eventId: pending.eventId,
    lat: pending.toLat,
    lng: pending.toLng,
    placeLabel: pending.toLabel,
  });
  clearPendingContextAnchorMove(input.graphId);
  appendGlobeChatTextMessage({
    graphId: input.graphId,
    role: "assistant",
    text: copy.globe.contextAnchor.moveCommitted(pending.toLabel),
  });
  return { kind: "committed", event };
}
