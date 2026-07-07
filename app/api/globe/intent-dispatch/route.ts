import { NextResponse } from "next/server";
import { callLlmTextJson } from "@/lib/llm/text-llm-client";

/**
 * Intent Dispatcher — classification-only LLM (The Dispatcher).
 *
 * Every typed input passes through here first. The model does ONE bounded job:
 * decide whether the message is Chat (social/affective), Search (needs a place
 * lookup), or Task (make/execute something), plus a short reasoning. It never
 * runs a search or writes an answer — routing stays with the deterministic
 * client, which falls back to its own rules when no provider is configured.
 */

const SYSTEM_PROMPT = `당신은 지도 어시스턴트의 "의도 분류기"입니다. 사용자의 한 줄 입력을 딱 3가지 중 하나로만 분류합니다. 검색을 실행하거나 답을 쓰지 마세요. 분류만 합니다.

카테고리:
- "chat": 인사·감사·위로·감탄·잡담 등 사교적/감정적 발화, 또는 정보 요구가 없는 말 (예: "ㅎㅇ", "고마워", "ㅋㅋ", "뭐 할 수 있어?").
- "search": 장소/정보/사실을 찾아야 하는 목적형 발화 (예: "오사카 놀거리", "조용한 카페", "근처 약국", "여기 어디야").
- "task": 무언가를 만들거나 실행하라는 지시 (예: "일정에 넣어줘", "요약해줘", "번역", "알림 설정").

규칙:
- 반드시 JSON 객체만: {"category": "chat"|"search"|"task", "reasoning": "<한국어 한 줄>"}
- history(직전 대화)가 주어지면 문맥을 고려하라. 예: 직전에 카페를 찾던 중 "응"은 search 흐름일 수 있다.
- 애매하면 "chat"으로 분류해 억지 검색을 피하라.
- 마크다운/코드펜스 금지.`;

type DispatchCategory = "chat" | "search" | "task";

function normalizeCategory(value: unknown): DispatchCategory | null {
  if (value === "chat" || value === "search" || value === "task") {
    return value;
  }
  return null;
}

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
  const region = typeof row.region === "string" ? row.region.trim() : "";
  const history = Array.isArray(row.history)
    ? row.history.filter((turn): turn is string => typeof turn === "string").slice(-6)
    : [];
  const hasActiveResults = row.hasActiveResults === true;

  const userText = JSON.stringify({ text, region: region || null, history, hasActiveResults });

  const raw = await callLlmTextJson({
    systemPrompt: SYSTEM_PROMPT,
    userText,
    temperature: 0.1,
  });

  // No provider or failure → let the client fall back to deterministic rules.
  if (!raw) {
    return NextResponse.json({ category: null, reasoning: null });
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    const value = JSON.parse(raw);
    parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return NextResponse.json({ category: null, reasoning: null });
  }

  return NextResponse.json({
    category: normalizeCategory(parsed.category),
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : null,
  });
}
