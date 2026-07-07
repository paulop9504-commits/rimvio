/**
 * Small-talk reply generator — the public entry both AI surfaces call once an
 * input is classified as Chat.
 *
 * Pipeline: (feedback loop) capture a pending slang definition → detect topic
 * (personal memory + lexicon) → extract the 5 variable groups → LLM composer
 * (context-aware, slang-fluent) → deterministic composer fallback. Slang we
 * don't know is admitted and asked about, then learned for next time.
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
import { extractUnknownSlangTerm } from "@/lib/globe/context-condition-ai/small-talk/slang-lexicon";
import {
  clearPendingSlangLearn,
  lookupSlangInText,
  readPendingSlangLearn,
  rememberSlang,
  setPendingSlangLearn,
} from "@/lib/globe/context-condition-ai/small-talk/slang-memory-store";

export type SmallTalkGeneration = {
  readonly replyKo: string;
  readonly topic: SmallTalkTopic;
  readonly source: "llm" | "deterministic" | "learned";
};

/** Short KO weather line for the small-talk `status.weatherKo` slot. */
async function fetchWeatherKo(region: string): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const response = await fetch(
      `/api/context/weather?location=${encodeURIComponent(region)}`,
    );
    if (!response.ok) {
      return null;
    }
    const w = (await response.json()) as {
      summary?: unknown;
      condition_label?: unknown;
      temp_c?: unknown;
    };
    const label =
      (typeof w.summary === "string" && w.summary.trim()) ||
      (typeof w.condition_label === "string" && w.condition_label.trim()) ||
      "";
    if (!label) {
      return null;
    }
    return typeof w.temp_c === "number" ? `${label} ${w.temp_c}도` : label;
  } catch {
    return null;
  }
}

/** Topics that mean "the user changed subject", not "here's the definition". */
const NON_DEFINITION_TOPICS: ReadonlySet<SmallTalkTopic> = new Set([
  "greeting",
  "thanks",
  "farewell",
  "ack",
  "filler",
  "slang_unknown",
]);

function summarize(text: string): string {
  const t = text.trim();
  return t.length <= 40 ? t : `${t.slice(0, 40)}…`;
}

export async function generateSmallTalkReply(input: {
  text: string;
  region?: string | null;
  weatherKo?: string | null;
  history?: readonly SmallTalkTurn[];
  recentSearchKo?: string | null;
  now?: Date;
  scopeId?: string | null;
}): Promise<SmallTalkGeneration> {
  const text = input.text.trim();
  const scopeId = input.scopeId?.trim() || null;

  // --- Feedback loop: was the previous turn a "what does X mean?" question? ---
  if (scopeId) {
    const pendingTerm = readPendingSlangLearn(scopeId);
    if (pendingTerm) {
      const detectedForDef = resolveSmallTalk({ text, region: input.region, now: input.now });
      const isDefinition =
        text.length > 0 && !(detectedForDef && NON_DEFINITION_TOPICS.has(detectedForDef.topic));
      clearPendingSlangLearn(scopeId);
      if (isDefinition) {
        rememberSlang({ key: pendingTerm, value: text, contextKo: "user_taught" });
        return {
          replyKo: `아, "${pendingTerm}"가 그런 뜻이군요! 기억해둘게요 🙂 다음엔 바로 알아들을게요. 그래서 오늘은 뭐가 궁금해요?`,
          topic: "catch_up",
          source: "learned",
        };
      }
      // Not a definition — fall through and treat as a fresh message.
    }
  }

  const detected = resolveSmallTalk({ text, region: input.region, now: input.now });
  const learned = lookupSlangInText(text);

  // If we've already learned this term, never ask again — treat as normal chat.
  let topic: SmallTalkTopic =
    detected?.topic ?? (learned ? "catch_up" : "catch_up");
  if (topic === "slang_unknown" && learned) {
    topic = "catch_up";
  }

  // Unknown slang → remember to ask; queue this term for the next turn.
  if (topic === "slang_unknown" && scopeId) {
    setPendingSlangLearn(scopeId, extractUnknownSlangTerm(text));
  }

  // Real-time weather for the anchor region — keyless Open-Meteo under the hood.
  const region = input.region?.trim() || null;
  const weatherKo =
    input.weatherKo?.trim() ||
    (region ? await fetchWeatherKo(region) : null);

  const context = extractSmallTalkContext({
    text,
    region: input.region,
    weatherKo,
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
          text,
          topic,
          strategy: readSmallTalkStrategy(topic).responseStrategy,
          context,
          knownSlangKo: learned ? `${learned.key}=${learned.value}` : null,
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

  // Deterministic path: if we know the slang, weave the meaning in.
  if (learned && topic === "catch_up") {
    return {
      replyKo: `아, ${learned.key}(${summarize(learned.value)}) 말이죠 🙂 ${deterministic}`,
      topic,
      source: "deterministic",
    };
  }

  return { replyKo: deterministic, topic, source: "deterministic" };
}
