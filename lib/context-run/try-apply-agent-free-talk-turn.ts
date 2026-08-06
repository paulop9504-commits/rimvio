/**
 * Free-talk / greeting turn for Workspace Agent + Globe composer.
 * Reply only — never Patch, Scout, or Job commit.
 */

import { generateSmallTalkReply } from "@/lib/globe/context-condition-ai/small-talk/generate-small-talk-reply";
import { looksLikeAgentFreeTalk } from "@/lib/context-run/looks-like-agent-free-talk";

export type AgentFreeTalkTurnResult = {
  readonly handled: true;
  readonly replyKo: string;
  readonly topic: string;
  readonly source: "llm" | "deterministic" | "learned";
};

/**
 * When utterance is greet/chit-chat, return a warm short reply.
 * Null → caller continues Agent Loop / planner.
 */
export async function tryApplyAgentFreeTalkTurn(input: {
  readonly utterance: string;
  readonly scopeId?: string | null;
  readonly regionKo?: string | null;
}): Promise<AgentFreeTalkTurnResult | null> {
  const utterance = input.utterance.trim();
  if (!looksLikeAgentFreeTalk(utterance)) return null;

  const gen = await generateSmallTalkReply({
    text: utterance,
    region: input.regionKo ?? null,
    scopeId: input.scopeId ?? null,
  });

  const replyKo = gen.replyKo.trim();
  if (!replyKo) return null;

  return {
    handled: true,
    replyKo,
    topic: gen.topic,
    source: gen.source,
  };
}
