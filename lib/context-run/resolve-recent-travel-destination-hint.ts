/**
 * Resolve travel destination hint for Agent execute when utterance omits place.
 * Current text → active Globe chat graph → composer graphId hint → all sessions.
 */

import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { resolveActiveComposerGraphId } from "@/lib/context-run/resolve-active-composer-graph-id";
import { readGlobeChatGraphId } from "@/lib/globe/chat/ensure-globe-chat-graph-id";
import {
  listGlobeChatSessionGraphIds,
  readGlobeChatMessages,
} from "@/lib/globe/chat/globe-chat-session-store";

function destFromUserLines(graphId: string): string | null {
  const messages = readGlobeChatMessages(graphId);
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.kind !== "text" || message.role !== "user") {
      continue;
    }
    const dest = extractTravelDestination(message.text);
    if (dest?.trim()) {
      return dest.trim();
    }
  }
  return null;
}

export function resolveRecentTravelDestinationHint(
  utterance: string,
  graphId?: string | null,
): string | null {
  const fromText = extractTravelDestination(utterance);
  if (fromText?.trim()) {
    return fromText.trim();
  }

  const candidates: string[] = [];
  const push = (id: string | null | undefined) => {
    const t = id?.trim();
    if (t && !candidates.includes(t)) candidates.push(t);
  };
  push(graphId);
  push(readGlobeChatGraphId());
  push(resolveActiveComposerGraphId(utterance));

  for (const id of candidates) {
    const dest = destFromUserLines(id);
    if (dest) return dest;
  }

  for (const id of listGlobeChatSessionGraphIds()) {
    const dest = destFromUserLines(id);
    if (dest) return dest;
  }
  return null;
}
