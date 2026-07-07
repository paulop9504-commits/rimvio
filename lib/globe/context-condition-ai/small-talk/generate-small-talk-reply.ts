/**
 * Small-talk reply generator — the public entry both AI surfaces call once an
 * input is classified as Chat.
 *
 * Pipeline: detect topic → extract the 5 variable groups → ask the LLM composer
 * (context-aware) → fall back to the deterministic composer when no provider is
 * configured or the call fails. Either way the reply reflects the situation and
 * ends with an open question.
 */
import {
  resolveSmallTalk,
  type SmallTalkTopic,
} from "@/lib/globe/context-condition-ai/resolve-small-talk";
import {
  extractSmallTalkContext,
  type SmallTalkTurn,
} from "@/lib/globe/context-condition-ai/small-talk/small-talk-context";
import { composeSmallTalkReply } from "@/lib/globe/context-condition-ai/small-talk/compose-small-talk-reply";
import { readSmallTalkStrategy } from "@/lib/globe/context-condition-ai/small-talk/small-talk-bank";

export type SmallTalkGeneration = {
  readonly replyKo: string;
  readonly topic: SmallTalkTopic;
  readonly source: "llm" | "deterministic";
};

export async function generateSmallTalkReply(input: {
  text: string;
  region?: string | null;
  weatherKo?: string | null;
  history?: readonly SmallTalkTurn[];
  recentSearchKo?: string | null;
  now?: Date;
}): Promise<SmallTalkGeneration> {
  const detected = resolveSmallTalk({
    text: input.text,
    region: input.region,
    now: input.now,
  });
  const topic: SmallTalkTopic = detected?.topic ?? "catch_up";

  const context = extractSmallTalkContext({
    text: input.text,
    region: input.region,
    weatherKo: input.weatherKo,
    history: input.history,
    recentSearchKo: input.recentSearchKo,
    now: input.now,
  });

  const deterministic = composeSmallTalkReply({ topic, context });

  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/globe/small-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text.trim(),
          topic,
          strategy: readSmallTalkStrategy(topic).responseStrategy,
          context,
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { replyKo?: unknown };
        if (typeof payload.replyKo === "string" && payload.replyKo.trim().length > 0) {
          return { replyKo: payload.replyKo.trim(), topic, source: "llm" };
        }
      }
    } catch {
      /* fall through to deterministic */
    }
  }

  return { replyKo: deterministic, topic, source: "deterministic" };
}
