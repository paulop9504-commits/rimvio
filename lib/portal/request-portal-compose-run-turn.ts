import { listLifeEventCandidates } from "@/lib/life-read-model";
import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import { buildComposeChatMemoryNotesKo } from "@/lib/portal/compose-chat/build-compose-chat-memory-notes";
import type { PortalComposeRunTurnResult } from "@/lib/portal/resolve-portal-compose-run-turn";
import type { PortalCategoryId, PortalIntentId } from "@/lib/portal/portal-types";
import { copy } from "@/lib/copy/human-ko";

export type PortalComposeRunTurnInput = {
  graphId: string;
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  message: string;
  eventId: string;
  liveLat?: number | null;
  liveLng?: number | null;
  resumeState?: PortalComposeRunState | null;
  answerText?: string | null;
  memoryNotesKo?: string | null;
};

function buildClientMemoryNotesKo(input: PortalComposeRunTurnInput): string | null {
  if (input.memoryNotesKo?.trim()) {
    return input.memoryNotesKo.trim();
  }
  if (typeof window === "undefined") {
    return null;
  }
  const contextParts = [
    input.resumeState?.accumulatedText ?? "",
    input.message,
    input.answerText ?? "",
  ].filter(Boolean);
  return buildComposeChatMemoryNotesKo({
    events: listLifeEventCandidates(),
    contextText: contextParts.join(" "),
  });
}

/** Browser-safe — runs LLM + slot fill on server where OPENAI_API_KEY lives. */
export async function requestPortalComposeRunTurn(
  input: PortalComposeRunTurnInput,
): Promise<PortalComposeRunTurnResult> {
  const memoryNotesKo = buildClientMemoryNotesKo(input);
  const response = await fetch("/api/globe/portal-compose-turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...input, memoryNotesKo }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      "[portal-compose-turn] http",
      response.status,
      await response.text().catch(() => ""),
    );
    throw new Error(copy.globe.ingestAttachFail);
  }

  return (await response.json()) as PortalComposeRunTurnResult;
}
