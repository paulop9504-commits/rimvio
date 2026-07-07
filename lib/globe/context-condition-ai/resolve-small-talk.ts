/**
 * The context assistant is not only an intent-convergence funnel. Brief small
 * talk — greetings, thanks, "뭐 할 수 있어?" — should get a short, warm reply
 * instead of being forced into a place search. Deterministic + KO-first, kept
 * intentionally tiny; anything with a real search cue falls through to the
 * convergence/search pipeline.
 */

export type SmallTalkReply = {
  readonly replyKo: string;
};

/** Any of these means the user actually wants a search — never small talk. */
const SEARCH_CUE =
  /찾|검색|추천|어디|맛집|카페|커피|호텔|숙소|놀거리|즐길|약국|편의점|병원|주변|근처|가고|가볼|명소|스팟|여행|예약|데이트|nearby|search|find|hotel|cafe|coffee|restaurant/iu;

const GREETING =
  /^(안녕|안뇽|하이|한녕|헬로|hello|hi+|hey|ㅎㅇ|여보세요|반가|방가|굿모닝|good\s*morning|좋은\s*아침)/iu;
const THANKS = /(고마|감사|ㄳ|ㄱㅅ|thank|thx|thanks)/iu;
const FAREWELL = /(잘\s*가|잘\s*있|바이|bye|굿바이|수고|잘자|잘\s*자|good\s*night)/iu;
const CAPABILITY =
  /(뭐\s*해|뭐\s*할\s*수|뭐할수|누구|정체|어떤\s*걸|무엇을|무슨\s*일|할\s*수\s*있|기능|도움|help|who\s*are\s*you|what\s*can\s*you)/iu;
const ACK =
  /^(ㅇㅋ|오케이|오키|ok|okay|굿|good|좋아|좋아요|나이스|nice|ㄱㄱ|고고|ㅇㅇ|응|넵|넹|알겠|알았|👍)/iu;
const FILLER = /^(ㅋ+|ㅎ+|😂|🤣|😊|🙂|헐|와+|우와|대박|음+|흠+)$/u;

function regionPhrase(region?: string | null): string {
  const trimmed = region?.trim();
  return trimmed ? trimmed : "";
}

/**
 * Warm generic reply when the dispatcher classifies a message as chat but no
 * specific small-talk pattern matched (e.g. an LLM-judged casual sentence).
 */
export function smallTalkFallbackReply(region?: string | null): SmallTalkReply {
  const area = regionPhrase(region);
  return {
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
}): SmallTalkReply | null {
  const text = input.text.trim();
  if (!text) {
    return null;
  }
  // Only short, non-actionable messages qualify — real searches fall through.
  if (text.length > 20 || SEARCH_CUE.test(text)) {
    return null;
  }
  const region = regionPhrase(input.region);

  if (GREETING.test(text)) {
    return {
      replyKo: region
        ? `안녕하세요! 지금 ${region} 보고 있어요. 가고 싶은 곳이나 하고 싶은 게 있으면 편하게 말해줘요 🙂`
        : "안녕하세요! 가고 싶은 곳이나 하고 싶은 게 있으면 편하게 말해줘요 🙂",
    };
  }
  if (THANKS.test(text)) {
    return { replyKo: "천만에요! 더 찾아드릴 거 있으면 말해줘요." };
  }
  if (FAREWELL.test(text)) {
    return { replyKo: "네, 좋은 시간 보내세요! 필요하면 언제든 불러줘요." };
  }
  if (CAPABILITY.test(text)) {
    return {
      replyKo: region
        ? `저는 ${region} 지도에서 맥락에 맞는 곳을 찾아 바로 꽂아드려요. 예: "놀거리", "조용한 카페", "근처 약국"`
        : '저는 지도에서 맥락에 맞는 곳을 찾아 바로 꽂아드려요. 예: "놀거리", "조용한 카페", "근처 약국"',
    };
  }
  if (ACK.test(text)) {
    return { replyKo: "👍 준비됐어요. 어떤 곳 찾아볼까요?" };
  }
  if (FILLER.test(text)) {
    return { replyKo: "ㅎㅎ 필요한 거 있으면 편하게 말해줘요 🙂" };
  }
  return null;
}
