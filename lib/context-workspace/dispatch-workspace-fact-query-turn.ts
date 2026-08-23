import { publishFactProjection } from "@/lib/fact-query/fact-projection-store";
import { resolveFactQueryAsync } from "@/lib/fact-query/resolve-fact-query";
import { appendWorkspaceChatTurn } from "@/lib/context-workspace/workspace-chat-store";

/**
 * Workspace early exit — Fact Query before Workspace Agent (Tier B).
 * Returns true when a deterministic fact answer was appended.
 */
export async function tryDispatchWorkspaceFactQueryTurn(input: {
  readonly contextEventId: string;
  readonly text: string;
  readonly projectToGlobe?: boolean;
}): Promise<boolean> {
  const eventId = input.contextEventId.trim();
  const text = input.text.trim();
  if (!eventId || !text || text.startsWith("@")) {
    return false;
  }

  const wire = await resolveFactQueryAsync(text);
  if (!wire) {
    return false;
  }

  if (input.projectToGlobe !== false && wire.evidence.length > 0) {
    publishFactProjection(wire);
  }

  appendWorkspaceChatTurn({
    contextEventId: eventId,
    role: "assistant",
    text: wire.headlineKo,
    factAnswer: wire,
  });

  return true;
}
