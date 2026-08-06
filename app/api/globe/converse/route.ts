import { NextResponse } from "next/server";
import { callLlmTextJson } from "@/lib/llm/text-llm-client";

/**
 * Conversational / knowledge reply — GPT-like answers outside Workspace Patch.
 * Longer OK. No hotel scout, no Reality Commit.
 */

const SYSTEM_PROMPT = `당신은 Rimvio의 대화 파트너입니다. 사용자는 작업장·지구 프롬프트에서 일반 대화나 지식 질문을 합니다.

규칙:
- 한국어로 답한다. 마크다운 헤딩(#)과 코드펜스는 쓰지 않는다.
- 인사·잡담이면 1~3문장으로 따뜻하게.
- 지식·설명 질문이면 4~10문장까지 자세히 답해도 된다. GPT처럼 핵심을 먼저 말하고 보충한다.
- 호텔 검색·예약·지도 핀·커밋을 실행하지 않는다. 필요하면 "작업장에서 「난바 호텔 찾아줘」처럼 말해 주세요"만 가볍게 안내.
- JSON만: {"replyKo": "<답변>"}`;

const SYSTEM_PROMPT_PRIORITIZE_CURRENT = `당신은 Rimvio의 대화 파트너입니다.

최우선 규칙:
- 사용자의 지금 메시지만 답한다. 이전 여행·일정·액티비티 대화를 끌어오지 않는다.
- 「1+1=?」 같은 질문이 오면 계산/지식만 짧게 답한다. 「지난번에…」로 시작하지 않는다.
- 여행 맥락으로 되돌아가 후속 질문을 만들지 않는다.
- 한국어. 마크다운 헤딩(#)·코드펜스 금지.
- JSON만: {"replyKo": "<답변>"}`;

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

  const prioritizeCurrent = row.prioritizeCurrent === true;
  const history = prioritizeCurrent
    ? []
    : Array.isArray(row.history)
      ? row.history.slice(-8)
      : [];
  const userText = JSON.stringify({ text, history });

  const raw = await callLlmTextJson({
    systemPrompt: prioritizeCurrent
      ? SYSTEM_PROMPT_PRIORITIZE_CURRENT
      : SYSTEM_PROMPT,
    userText,
    temperature: prioritizeCurrent ? 0.2 : 0.6,
  });

  if (!raw) {
    return NextResponse.json({ replyKo: null });
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    const value = JSON.parse(raw);
    parsed =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : null;
  } catch {
    parsed = null;
  }

  const replyKo =
    parsed &&
    typeof parsed.replyKo === "string" &&
    parsed.replyKo.trim().length > 0
      ? parsed.replyKo.trim()
      : null;

  return NextResponse.json({ replyKo });
}
