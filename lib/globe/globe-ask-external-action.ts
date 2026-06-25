"use client";

import { requestGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import type { ExternalOpportunityCta } from "@/lib/external-context-ask/external-context-opportunity-types";

export type GlobeAskExternalActionInput = {
  cta: ExternalOpportunityCta;
  eventId?: string;
  threadId?: string;
};

/** Discovery ask card → peer thread or globe focus. */
export function runGlobeAskExternalAction(input: GlobeAskExternalActionInput): void {
  if (input.cta === "chat" && input.threadId?.trim()) {
    if (typeof window !== "undefined") {
      window.location.assign(`/peers/${input.threadId.trim()}`);
    }
    return;
  }

  const eventId = input.eventId?.trim();
  if (!eventId) {
    return;
  }

  const mode =
    input.cta === "view_map"
      ? "map"
      : input.cta === "open_bridge"
        ? "bridge"
        : input.cta === "join" || input.cta === "trade"
          ? "bridge"
          : "map";

  requestGlobeAskBridgeFocus(eventId, mode);
}
