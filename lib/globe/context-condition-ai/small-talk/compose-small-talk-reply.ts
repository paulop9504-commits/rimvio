import type { SmallTalkTopic } from "@/lib/globe/context-condition-ai/resolve-small-talk";
import type {
  SmallTalkContext,
  SmallTalkPartOfDay,
} from "@/lib/globe/context-condition-ai/small-talk/small-talk-context";

/**
 * Deterministic context-aware composer (Stage 2 fallback).
 *
 * Builds a reply the way the spec asks: throw the *situation* first, weave in a
 * meta-cognitive nod to recent activity when we have it, and always close with
 * an open-ended question. Register mirrors the user (반말 only once we're
 * familiar). Everything is seeded off the context so consecutive replies vary
 * without being random — and stays testable.
 */

function pick<T>(arr: readonly T[], seed: number): T {
  const i = ((seed % arr.length) + arr.length) % arr.length;
  return arr[i];
}

function timeGreetingKo(part: SmallTalkPartOfDay): string {
  switch (part) {
    case "dawn":
      return "이른 새벽이네요.";
    case "morning":
      return "좋은 아침이에요!";
    case "afternoon":
      return "안녕하세요, 어느새 오후네요.";
    case "evening":
      return "저녁 시간이 됐네요.";
    case "night":
      return "밤이 깊어가네요.";
    case "late_night":
      return "늦은 시간까지 고생 많아요.";
  }
}

function useCasual(context: SmallTalkContext): boolean {
  return context.tone.register === "banmal" && context.persona.intimacy >= 2;
}

const QUESTIONS: Record<SmallTalkTopic, { formal: readonly string[]; casual: readonly string[] }> = {
  greeting: {
    formal: ["오늘 하루는 어떠셨어요?", "지금 가보고 싶은 데 있으세요?", "오늘은 뭐 할 계획이에요?"],
    casual: ["오늘 하루 어땠어?", "어디 가보고 싶은 데 있어?", "오늘 뭐 할 거야?"],
  },
  weather: {
    formal: ["오늘은 어디 가볼 생각이세요?", "이런 날엔 뭐 하고 싶으세요?"],
    casual: ["오늘 어디 가볼 거야?", "이런 날엔 뭐 하고 싶어?"],
  },
  time_state: {
    formal: ["잠깐 쉬어가는 건 어때요?", "지금 뭐가 제일 필요하세요?"],
    casual: ["잠깐 쉬었다 하는 건 어때?", "지금 뭐가 제일 필요해?"],
  },
  food: {
    formal: ["뭐가 제일 당기세요?", "근처로 찾아드릴까요?"],
    casual: ["뭐가 제일 당겨?", "근처로 찾아줄까?"],
  },
  mood_up: {
    formal: ["무슨 좋은 일이에요?", "어떻게 된 거예요?"],
    casual: ["무슨 좋은 일이야?", "어떻게 된 거야?"],
  },
  mood_down: {
    formal: ["무슨 일 있었어요?", "괜찮으세요? 얘기해도 돼요."],
    casual: ["무슨 일 있었어?", "괜찮아? 얘기해도 돼."],
  },
  catch_up: {
    formal: ["요즘 어떻게 지내세요?", "별일 없으셨어요?"],
    casual: ["요즘 어떻게 지내?", "별일 없었어?"],
  },
  capability: {
    formal: ["뭐부터 찾아드릴까요?"],
    casual: ["뭐부터 찾아줄까?"],
  },
  thanks: {
    formal: ["더 도와드릴 거 있어요?"],
    casual: ["더 도와줄 거 있어?"],
  },
  farewell: {
    formal: ["다음에 또 얘기해요, 그쵸?"],
    casual: ["다음에 또 보자, 알겠지?"],
  },
  ack: {
    formal: ["어떤 곳부터 볼까요?"],
    casual: ["어디부터 볼까?"],
  },
  filler: {
    formal: ["편하게 말 걸어줘요, 뭐 궁금한 거 있어요?"],
    casual: ["편하게 말 걸어, 뭐 궁금한 거 있어?"],
  },
};

function buildOpener(topic: SmallTalkTopic, context: SmallTalkContext): string {
  const { time, status, persona } = context;
  switch (topic) {
    case "greeting": {
      const hi = timeGreetingKo(time.partOfDay);
      if (status.regionKo && context.variantSeed % 2 === 0) {
        return `${hi} 지금 ${status.regionKo} 보고 있었어요.`;
      }
      return hi;
    }
    case "weather": {
      const bySeason: Record<string, string> = {
        summer: "여름이라 그런지 날씨 얘기가 절로 나오죠.",
        winter: "겨울이라 날씨에 더 신경 쓰이죠.",
        spring: "봄 날씨가 기분을 오락가락하게 하죠.",
        autumn: "가을 날씨가 괜히 싱숭생숭하죠.",
      };
      return bySeason[time.season];
    }
    case "time_state": {
      if (time.isMonday) return "월요일이라 더 그럴 수 있어요.";
      if (time.isFriday) return "그래도 오늘 금요일이에요.";
      if (time.isWeekend) return "주말이라 좀 늘어져도 괜찮아요.";
      return pick(["오늘 하루가 꽤 길었나 봐요.", "오늘따라 유난히 그런 날인가 봐요."], context.variantSeed);
    }
    case "food": {
      const when = time.partOfDay === "afternoon" && time.hour < 14 ? "딱 점심때네요. " : "";
      return `${when}뭔가 맛있는 게 당기는 시간이죠.`;
    }
    case "mood_up":
      return pick(["우와, 글에서 신남이 느껴져요! 🎉", "오, 좋은 기운이 팍팍 오는데요! 😄"], context.variantSeed);
    case "mood_down":
      return pick(["저런.. 많이 속상했겠어요. 🥺", "어이고.. 오늘 마음이 힘들었나 봐요."], context.variantSeed);
    case "catch_up":
      return pick(["오랜만에 이런 얘기 반가워요.", "이렇게 말 걸어주니 좋네요 🙂"], context.variantSeed);
    case "capability":
      return status.regionKo
        ? `저는 ${status.regionKo} 지도에서 맥락에 맞는 곳을 찾아 바로 꽂아드려요.`
        : "저는 지도에서 맥락에 맞는 곳을 찾아 바로 꽂아드려요.";
    case "thanks":
      return persona.intimacy >= 2 ? "천만에! 도움이 됐다니 다행이야." : "천만에요! 도움이 됐다니 다행이에요.";
    case "farewell":
      return time.partOfDay === "late_night" ? "늦었으니 얼른 쉬어요." : "네, 오늘도 수고 많았어요.";
    case "ack":
      return "좋아요.";
    case "filler":
      return "ㅎㅎ 좋네요.";
  }
}

function buildMetaCognition(topic: SmallTalkTopic, context: SmallTalkContext): string | null {
  const recent = context.history.recentSearchKo;
  if (!recent) {
    return null;
  }
  if (topic === "greeting" || topic === "catch_up") {
    return pick(
      [`아까 찾던 ${recent}, 잘 보셨는지 궁금했어요.`, `지난번 ${recent} 이야기도 생각나고요.`],
      context.variantSeed + 1,
    );
  }
  return null;
}

function buildQuestion(topic: SmallTalkTopic, context: SmallTalkContext): string {
  const bank = QUESTIONS[topic];
  const pool = useCasual(context) ? bank.casual : bank.formal;
  return pick(pool, context.variantSeed + 2);
}

export function composeSmallTalkReply(input: {
  topic: SmallTalkTopic;
  context: SmallTalkContext;
}): string {
  const { topic, context } = input;
  const segments = [buildOpener(topic, context)];
  const meta = buildMetaCognition(topic, context);
  if (meta) {
    segments.push(meta);
  }
  segments.push(buildQuestion(topic, context));
  return segments
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(" ");
}
