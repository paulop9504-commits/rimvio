import { NextResponse } from "next/server";
import { callLlmTextJson } from "@/lib/llm/text-llm-client";

/**
 * Context-aware small-talk composer (Stage 2, LLM path).
 *
 * The client has already classified the message as Chat and extracted the 5
 * variable groups (time/status/history/tone/persona). Here the model turns those
 * variables + the topic's response strategy into ONE natural line: situation
 * first, an optional meta-cognitive nod to recent activity, and an open-ended
 * question to keep the conversation going. No search, no markdown. When no
 * provider is configured the client falls back to its deterministic composer.
 */

const SYSTEM_PROMPT = `당신은 사용자의 일상을 챙기는 똑똑하고 다정한 친구입니다. 지도 어시스턴스 안에서 짧은 스몰토크에만 답합니다.

입력으로 [topic], [strategy], 그리고 [context](시간/상태/히스토리/톤/페르소나 변수)가 JSON으로 주어집니다.

작성 규칙:
- 정확히 1~2문장. 한국어. 마크다운/코드펜스 금지.
- 고정된 상투구 대신 context 변수를 실제로 반영하라. (예: 시간대·요일·계절·지역·최근 검색)
- 상황을 먼저 던지고(예: "오늘 좀 흐리네요"), 마지막은 반드시 열린 질문으로 끝내라.
- context.history.recentSearchKo가 있으면 자연스럽게 메타 인지로 한 번 언급하라. (예: "아까 찾던 …는 잘 봤어요?")
- context.tone.register가 "banmal"이고 persona.intimacy가 2 이상일 때만 반말. 그 외엔 존댓말.
- 감정(mood_down)은 검색을 권하지 말고 공감과 질문만. food/weather는 가벼운 제안을 곁들여도 좋다.
- strategy 지침을 따르되 그대로 베끼지 말고 자연스럽게 녹여라.

[신조어·줄임말 해석 지침]
- 당신은 요즘 신조어/줄임말에 능통한 친구다. 뜻을 먼저 '문맥(history)'과 '말투/이모지'에서 유추하라.
- knownSlangKo가 주어지면(형식 "단어=뜻") 그 뜻을 이미 아는 것처럼 자연스럽게 반영하라. 다시 묻지 마라.
- topic이 "slang_unknown"이면 아는 척하지 말고 솔직히 인정하고, 무슨 뜻인지 물어 기억해두겠다고 하라. (예: "그거 요즘 쓰는 말이에요? 어떤 뜻인지 알려주면 잘 기억해둘게요!")
- 뜻을 몰라도 이모지(😂/😤/😭)나 어미로 분위기를 파악해 감정에 먼저 공감하라. (예: 화난 톤이면 "무슨 일 있었어요?")
- 예시: 입력 "킹받네" → "헉 뭐 때문에 그렇게 킹받았어요? 무슨 일인지 말해봐요." / 입력 "갓생 산다" → "오 갓생 시작이네요! 오늘은 뭐부터 해볼 거예요?"

- 반드시 JSON만: {"replyKo": "<한두 문장>"}`;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const row = body as Record<string, unknown>;
  const text = typeof row.text === "string" ? row.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  const topic = typeof row.topic === "string" ? row.topic : "catch_up";
  const strategy = typeof row.strategy === "string" ? row.strategy : "";
  const context =
    row.context && typeof row.context === "object" ? row.context : {};
  const knownSlangKo =
    typeof row.knownSlangKo === "string" ? row.knownSlangKo : null;

  const userText = JSON.stringify({ text, topic, strategy, context, knownSlangKo });

  const raw = await callLlmTextJson({
    systemPrompt: SYSTEM_PROMPT,
    userText,
    temperature: 0.7,
  });

  if (!raw) {
    return NextResponse.json({ replyKo: null });
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    const value = JSON.parse(raw);
    parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  const replyKo =
    parsed && typeof parsed.replyKo === "string" && parsed.replyKo.trim().length > 0
      ? parsed.replyKo.trim()
      : null;

  return NextResponse.json({ replyKo });
}
