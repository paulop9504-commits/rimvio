/**
 * The context assistant is not only an intent-convergence funnel. Brief small
 * talk — greetings, weather, "뭐 먹지?", "오늘 피곤하다", "나 오늘 일찍 끝났다!" —
 * should get a short, warm, human reply instead of being forced into a place
 * search. Deterministic + KO-first, time-aware where it helps.
 *
 * Design (per product spec): a keyword map over the 5 everyday small-talk
 * families. A message is small talk when it hits a family keyword AND has no
 * explicit search verb/locator (찾/추천/어디/근처 …). Food cravings are the one
 * "hybrid" family: we reply with empathy AND nudge toward a nearby search in the
 * same clean turn — so it feels intelligent without auto-dropping pins.
 */

import {
  detectSlangTopic,
  looksLikeUnknownSlang,
} from "@/lib/globe/context-condition-ai/small-talk/slang-lexicon";

export type SmallTalkTopic =
  | "greeting"
  | "thanks"
  | "farewell"
  | "capability"
  | "weather"
  | "time_state"
  | "food"
  | "mood_up"
  | "mood_down"
  | "catch_up"
  | "ack"
  | "filler"
  | "slang_unknown";

export type SmallTalkReply = {
  readonly replyKo: string;
  readonly topic: SmallTalkTopic;
  /** Food family: a gentle "want me to search?" nudge is baked into replyKo. */
  readonly suggestsSearch?: boolean;
};

/**
 * Explicit search intent — a verb/locator or an unambiguous place category.
 * If any of these appear, the message is a real request; never small talk.
 * Note: soft nouns like 커피/카페/맛집 are intentionally NOT here, so cravings
 * ("커피 당기네") stay conversational while "카페 어디" / "맛집 추천" pass through.
 */
const HARD_SEARCH =
  /찾|검색|추천|어디|근처|주변|가까운|가볼|가고\s*싶|데려|예약|알려줘|알려줄|보여줘|호텔|숙소|약국|편의점|병원|명소|스팟|nearby|search|find|hotel/iu;

const GREETING =
  /^(안녕|안뇽|하이|한녕|헬로|hello|hi+|hey|ㅎㅇ|여보세요|반가|방가|굿모닝|good\s*morning|좋은\s*아침)/iu;
const THANKS = /(고마|감사|ㄳ|ㄱㅅ|thank|thx|thanks)/iu;
const FAREWELL = /(잘\s*가|잘\s*있|바이|bye|굿바이|잘자|잘\s*자|good\s*night)/iu;
const CAPABILITY =
  /(뭐\s*해|뭐\s*할\s*수|뭐할수|누구|정체|어떤\s*걸|무엇을|무슨\s*일\s*해|할\s*수\s*있|기능|도움\s*줄|도와줄|help|who\s*are\s*you|what\s*can\s*you)/iu;

const WEATHER_HOT = /(덥|더워|더운|폭염|무더|찜통)/iu;
const WEATHER_COLD = /(춥|추워|추운|한파|쌀쌀|영하)/iu;
const WEATHER_RAIN = /(비\s*와|비\s*온|비\s*오|비가|장마|소나기|우산)/iu;
const WEATHER_SNOW = /(눈\s*와|눈\s*온|눈\s*오|폭설|함박눈)/iu;
const WEATHER_AIR = /(미세먼지|초미세|공기|매연|황사)/iu;
const WEATHER_ANY = /(날씨|맑네|맑다|흐리|습하|건조|바람\s*많|태풍)/iu;
const WEATHER_TEMP =
  /(기온|온도|체감\s*온도|몇\s*도|temperature|temp\b|날씨\s*어때|날씨\s*알려|지금\s*날씨|현재\s*날씨)/iu;

const FOOD_HUNGRY = /(배\s*고|배고|출출|허기|야식)/iu;
const FOOD_CRAVE = /(당기네|당긴|당겨|당김|땡기|입맛)/iu;
const FOOD_WHAT =
  /(뭐\s*먹지|뭐먹지|뭐\s*먹을|뭐먹을|뭐\s*먹나|점심\s*뭐|저녁\s*뭐|아침\s*뭐|메뉴\s*고민|뭐\s*먹|뭐먹)/iu;

const MOOD_UP =
  /(대박|신난|신나|짱|최고|행복|뿌듯|잘\s*됐|잘됐|잘\s*풀|합격|붙었|성공|일찍\s*끝|칼퇴|개꿀|기분\s*좋|기분\s*최고|룰루)/iu;
const MOOD_DOWN =
  /(속상|우울|짜증|빡쳐|빡침|화나|화남|망했|망함|최악|눈물|서럽|서러|현타|현자타임|힘들었|지쳤|지친|번아웃|멘붕|슬프|슬퍼|외로|실수|실패|아쉽)/iu;

const TIME_TIRED = /(피곤|졸리|졸려|나른|기운\s*없|힘드네|힘들다|축\s*처|귀찮)/iu;
const TIME_FAST = /(벌써\s*시간|시간\s*빨|시간이\s*왜|벌써\s*이렇게|하루\s*가)/iu;
const TIME_WEEKEND = /(주말|불금|불토|토요일|일요일)/iu;
const TIME_MONDAY = /(월요일|월요병|한\s*주\s*시작|출근하기\s*싫)/iu;
const TIME_FRIDAY = /(금요일)/iu;

const CATCH_UP =
  /(별일\s*없|잘\s*지내|요즘\s*어때|요즘\s*뭐|심심|드라마|영화\s*봤|영화\s*보|재밌더|재밌어|재밌었|본\s*거\s*있|뭐하고\s*지내)/iu;

const ACK =
  /^(ㅇㅋ|오케이|오키|ok|okay|굿|good|좋아|좋아요|나이스|nice|ㄱㄱ|고고|ㅇㅇ|응|넵|넹|알겠|알았|👍)/iu;
const FILLER = /^(ㅋ+|ㅎ+|😂|🤣|😊|🙂|헐|와+|우와|대박|음+|흠+)$/u;
const EMOJI_NEG = /😤|😡|🤬|😭|😢|😞|😩|😥|ㅠㅠ|ㅜㅜ/u;
const EMOJI_POS = /😂|🤣|😄|😆|😊|🥳|😍|🤩/u;

const SLANG_TOPIC_REPLY: Record<SmallTalkTopic, string> = {
  greeting: "반가워요 🙂",
  thanks: "천만에요!",
  farewell: "네, 또 봐요!",
  capability: "제가 도울 수 있어요 🙂",
  weather: "날씨가 그렇죠.",
  time_state: "오늘 하루도 고생 많았어요.",
  food: "뭔가 당기는 시간이죠 😋",
  mood_up: "오, 좋은데요! 😄 무슨 좋은 일이에요?",
  mood_down: "저런.. 무슨 일 있었어요? 🥺",
  catch_up: "오 그래요? 🙂",
  ack: "👍 인정이요!",
  filler: "ㅎㅎ 그쵸.",
  slang_unknown: "그거 요즘 쓰는 말이에요? 무슨 뜻인지 알려주면 잘 기억해둘게요 🙂 어떤 상황에서 쓰는 거예요?",
};

function regionPhrase(region?: string | null): string {
  const trimmed = region?.trim();
  return trimmed ? trimmed : "";
}

type Clock = {
  isMorning: boolean;
  isLunch: boolean;
  isEvening: boolean;
  isLateNight: boolean;
  isWeekend: boolean;
  isMonday: boolean;
  isFriday: boolean;
};

function readClock(now: Date): Clock {
  const day = now.getDay();
  const hour = now.getHours();
  return {
    isMorning: hour >= 5 && hour < 10,
    isLunch: hour >= 11 && hour < 14,
    isEvening: hour >= 17 && hour < 21,
    isLateNight: hour >= 23 || hour < 5,
    isWeekend: day === 0 || day === 6,
    isMonday: day === 1,
    isFriday: day === 5,
  };
}

/**
 * Warm generic reply when the dispatcher classifies a message as chat but no
 * specific small-talk pattern matched (e.g. an LLM-judged casual sentence).
 */
export function smallTalkFallbackReply(region?: string | null): SmallTalkReply {
  const area = regionPhrase(region);
  return {
    topic: "catch_up",
    replyKo: area
      ? `네, 편하게 말해줘요 🙂 ${area}에서 가고 싶은 곳이나 궁금한 게 있으면 도와드릴게요.`
      : "네, 편하게 말해줘요 🙂 가고 싶은 곳이나 궁금한 게 있으면 도와드릴게요.",
  };
}

/**
 * Classify a *typed* message as small talk. Returns a short reply, or null when
 * the message should flow into the search/convergence pipeline.
 */
export function resolveSmallTalk(input: {
  text: string;
  region?: string | null;
  now?: Date;
}): SmallTalkReply | null {
  const text = input.text.trim();
  if (!text) {
    return null;
  }
  // Only short, non-actionable messages qualify. An explicit search verb/locator
  // means the user actually wants a search — let it fall through.
  if (text.length > 48 || HARD_SEARCH.test(text)) {
    return null;
  }
  const region = regionPhrase(input.region);
  const clock = readClock(input.now ?? new Date());

  if (GREETING.test(text)) {
    const timeHi = clock.isLateNight
      ? "늦은 시간이네요"
      : clock.isMorning
        ? "좋은 아침이에요"
        : "안녕하세요";
    return {
      topic: "greeting",
      replyKo: region
        ? `${timeHi}! 지금 ${region} 보고 있어요. 가고 싶은 곳이나 하고 싶은 게 있으면 편하게 말해줘요 🙂`
        : `${timeHi}! 가고 싶은 곳이나 하고 싶은 게 있으면 편하게 말해줘요 🙂`,
    };
  }
  if (THANKS.test(text)) {
    return { topic: "thanks", replyKo: "천만에요! 더 찾아드릴 거 있으면 말해줘요 🙂" };
  }
  if (FAREWELL.test(text)) {
    return { topic: "farewell", replyKo: "네, 좋은 시간 보내세요! 필요하면 언제든 불러줘요 👋" };
  }
  if (CAPABILITY.test(text)) {
    return {
      topic: "capability",
      replyKo: region
        ? `저는 ${region} 지도에서 맥락에 맞는 곳을 찾아 바로 꽂아드려요. 예: "놀거리", "조용한 카페", "근처 약국"`
        : '저는 지도에서 맥락에 맞는 곳을 찾아 바로 꽂아드려요. 예: "놀거리", "조용한 카페", "근처 약국"',
    };
  }

  // 1) Weather — the classic ice-breaker.
  if (WEATHER_TEMP.test(text)) {
    return {
      topic: "weather",
      replyKo: region
        ? `${region} 날씨 확인해볼게요.`
        : "지금 날씨 확인해볼게요.",
    };
  }
  if (WEATHER_HOT.test(text)) {
    return {
      topic: "weather",
      suggestsSearch: true,
      replyKo: "오늘 진짜 덥죠 🥵 시원한 데서 쉬어가요. '근처 카페'라고 하면 바로 찾아드릴게요.",
    };
  }
  if (WEATHER_COLD.test(text)) {
    return {
      topic: "weather",
      suggestsSearch: true,
      replyKo: "많이 춥네요 🥶 따뜻한 데 있고 싶어지죠. '근처 카페'라고 하면 찾아드릴게요.",
    };
  }
  if (WEATHER_RAIN.test(text)) {
    return {
      topic: "weather",
      suggestsSearch: true,
      replyKo: "비 오는 날은 괜히 차분해지죠 ☔ 실내에서 쉬기 좋은 곳 찾아드릴까요? '근처 카페'라고 해줘요.",
    };
  }
  if (WEATHER_SNOW.test(text)) {
    return { topic: "weather", replyKo: "눈 오네요 ❄️ 길 미끄러우니 조심히 다녀요." };
  }
  if (WEATHER_AIR.test(text)) {
    return {
      topic: "weather",
      suggestsSearch: true,
      replyKo: "공기가 영 별로네요 😷 오늘은 실내가 나을 것 같아요. '근처 카페' 찾아드릴까요?",
    };
  }
  if (WEATHER_ANY.test(text)) {
    return { topic: "weather", replyKo: "날씨 얘기 나오면 괜히 반갑네요 🙂 오늘 하루 어때요?" };
  }

  // 2) Food & lunch — hybrid: empathy + nearby-search nudge in one clean turn.
  if (FOOD_HUNGRY.test(text) || FOOD_CRAVE.test(text) || FOOD_WHAT.test(text)) {
    const lead = FOOD_HUNGRY.test(text)
      ? "많이 출출하시군요 😋"
      : FOOD_CRAVE.test(text)
        ? "오늘따라 뭔가 당기시나 봐요 😋"
        : "맛있는 거 고민 중이시군요 😋";
    const lunchNote = clock.isLunch ? " 딱 점심때네요." : "";
    return {
      topic: "food",
      suggestsSearch: true,
      replyKo: `${lead}${lunchNote} '근처 맛집'이나 '카페'라고 하면 바로 찾아드릴게요.`,
    };
  }

  // 3) Emotional — reactions matter more than results here.
  if (MOOD_UP.test(text)) {
    return { topic: "mood_up", replyKo: "우와, 잘됐네요! 🎉 좋은 일은 나눌수록 커지죠 😄" };
  }
  if (MOOD_DOWN.test(text)) {
    return {
      topic: "mood_down",
      replyKo: "저런.. 무슨 일 있었어요? 🥺 얘기하고 싶으면 편하게 말해줘요.",
    };
  }

  // 4) Time & state — pair with the current clock/day for a snug reply.
  if (TIME_MONDAY.test(text) || (TIME_TIRED.test(text) && clock.isMonday)) {
    return { topic: "time_state", replyKo: "월요일이네요, 이번 주도 파이팅! 💪" };
  }
  if (TIME_FRIDAY.test(text) || (text.includes("불금") && clock.isFriday)) {
    return { topic: "time_state", replyKo: "불금이네요! 🎉 오늘 저녁은 뭔가 특별하게 보내요." };
  }
  if (TIME_WEEKEND.test(text) || (text.includes("좋다") && clock.isWeekend)) {
    return { topic: "time_state", replyKo: "주말엔 역시 여유가 최고죠 🙂 푹 쉬면서 충전해요." };
  }
  if (TIME_TIRED.test(text)) {
    return {
      topic: "time_state",
      replyKo: clock.isLateNight
        ? "늦게까지 고생 많네요 🥺 무리하지 말고 얼른 쉬어요."
        : "오늘 많이 피곤하셨나 봐요 🥺 잠깐 쉬어가도 괜찮아요.",
    };
  }
  if (TIME_FAST.test(text)) {
    return { topic: "time_state", replyKo: "그러게요, 시간 진짜 빠르네요 ⏰ 오늘 하루 잘 마무리해요." };
  }

  // 5) Catch-up / light updates — keep it warm and curious.
  if (CATCH_UP.test(text)) {
    return { topic: "catch_up", replyKo: "오랜만에 이런 얘기 좋네요 🙂 요즘 어떻게 지내요?" };
  }

  // 6) Known slang — respond by the mapped mood/intent (킹받네 → 위로).
  const slang = detectSlangTopic(text);
  if (slang) {
    return { topic: slang.topic, replyKo: SLANG_TOPIC_REPLY[slang.topic] };
  }

  if (ACK.test(text)) {
    return { topic: "ack", replyKo: "👍 준비됐어요. 어떤 곳 찾아볼까요?" };
  }
  if (FILLER.test(text)) {
    return { topic: "filler", replyKo: "ㅎㅎ 필요한 거 있으면 편하게 말해줘요 🙂" };
  }

  // 7) Emotion from emoji even when the words are opaque (킹아정😤 → 위로).
  if (EMOJI_NEG.test(text)) {
    return { topic: "mood_down", replyKo: SLANG_TOPIC_REPLY.mood_down };
  }
  if (EMOJI_POS.test(text)) {
    return { topic: "mood_up", replyKo: SLANG_TOPIC_REPLY.mood_up };
  }

  // 8) Unknown neologism (초성 뭉치) — admit it and ask, so we can learn it.
  if (looksLikeUnknownSlang(text)) {
    return { topic: "slang_unknown", replyKo: SLANG_TOPIC_REPLY.slang_unknown };
  }

  return null;
}
