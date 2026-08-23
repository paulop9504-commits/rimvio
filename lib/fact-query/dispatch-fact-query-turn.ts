import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import { publishFactProjection } from "@/lib/fact-query/fact-projection-store";
import {
  resolveFactQuery,
  resolveFactQueryAsync,
} from "@/lib/fact-query/resolve-fact-query";
import type { FactAnswerWire } from "@/lib/fact-query/types";

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

function buildTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
  wire: FactAnswerWire;
  projectToGlobe?: boolean;
}): ActionChatMessage[] {
  if (input.projectToGlobe !== false && input.wire.evidence.length > 0) {
    publishFactProjection(input.wire);
  }

  const assistantId = crypto.randomUUID();
  return [
    createChatMessage("user", input.text.trim(), { chatAxis: input.chatAxis }),
    createChatMessage("assistant", input.wire.headlineKo, {
      id: assistantId,
      inlineChatFactAnswer: input.wire,
      metadata: mentionOrchestratorMetadata({
        mention_feature: "fact_query",
        sourceRef: `fact:${input.wire.kind}`,
      }),
    }),
  ];
}

export function tryBuildFactQueryTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
  projectToGlobe?: boolean;
}): ActionChatMessage[] | null {
  const wire = resolveFactQuery(input.text);
  if (!wire) {
    return null;
  }
  return buildTurn(input);
}

export async function tryBuildFactQueryTurnAsync(input: {
  text: string;
  chatAxis?: ChatAxis;
  projectToGlobe?: boolean;
}): Promise<ActionChatMessage[] | null> {
  const wire = await resolveFactQueryAsync(input.text);
  if (!wire) {
    return null;
  }
  return buildTurn(input);
}

export function projectFactAnswerToGlobe(wire: FactAnswerWire): void {
  publishFactProjection(wire);
}
