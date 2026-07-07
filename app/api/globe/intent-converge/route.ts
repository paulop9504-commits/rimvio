import { NextResponse } from "next/server";
import { callLlmTextJson } from "@/lib/llm/text-llm-client";

/**
 * Intent Convergence Engine — LLM router endpoint.
 *
 * The LLM does two bounded jobs: (1) pick which candidate axis best narrows the
 * search, and (2) author 2~4 city-tailored choices whose `refinedQuery` is a
 * concrete place query. It never runs the search or invents resource types.
 */

const SYSTEM_PROMPT = `당신은 여행/로컬 검색 "의도 수렴 라우터"입니다. 사용자의 애매한 요청을 가장 적은 질문으로 좁힙니다.
핵심 철학: 사용자의 선택은 단순 필터가 아니라 "트리거"입니다. 하나의 선택은 관련 노드망을 활성화합니다.
예: "도파민" → [테마파크, 놀이공원, 유니버설 스튜디오, VR, 포토스팟, 야경]. 검색은 이 노드망 전체에서 이뤄집니다.

주어진 candidateAxes(후보 질문 축) 중에서 "후보를 가장 많이 줄일 수 있는 축 1개"를 고르고, 그 축에 대한 도시 맞춤 선택지 2~4개를 만드세요.
규칙:
- 반드시 JSON 객체만 출력: {"axisId": "<선택한 축 id>", "promptKo": "<한국어 질문 한 줄>", "choices": [{"id","labelKo","refinedQuery","blurbKo","nodeCluster"}]}
- axisId는 반드시 candidateAxes 중 하나의 id.
- labelKo: 이모지 1개 + 짧은 성향 라벨.
- blurbKo: 한 줄 설명. 해당 도시의 대표 명소를 자연스럽게 예로 들어라(예: 오사카면 유니버설 스튜디오/도톤보리).
- refinedQuery: 대표 질의 1개. 반드시 지역명 + 구체 카테고리 포함(예: "오사카 유니버설 스튜디오").
- nodeCluster: 그 선택이 활성화하는 관련 검색 노드 3~6개(지역명 없이 카테고리/명소만, 예: ["테마파크","놀이공원","포토스팟","야경 명소"]). 이 노드들로 확장 검색합니다.
- 2~4개. 마크다운/코드펜스/JSON 외 텍스트 금지.`;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const row = body as Record<string, unknown>;
  const query = typeof row.query === "string" ? row.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "query_required" }, { status: 400 });
  }
  const intentType = typeof row.intentType === "string" ? row.intentType : "";
  const region = typeof row.region === "string" ? row.region.trim() : "";
  const candidateAxes = Array.isArray(row.candidateAxes) ? row.candidateAxes : [];

  const userText = JSON.stringify({
    query,
    intentType,
    region: region || null,
    candidateAxes,
  });

  const raw = await callLlmTextJson({
    systemPrompt: SYSTEM_PROMPT,
    userText,
    temperature: 0.4,
  });

  // No provider configured or failure → let the client use deterministic chips.
  if (!raw) {
    return NextResponse.json({ axisId: null, promptKo: null, choices: [] });
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    const value = JSON.parse(raw);
    parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return NextResponse.json({ axisId: null, promptKo: null, choices: [] });
  }

  return NextResponse.json({
    axisId: typeof parsed.axisId === "string" ? parsed.axisId : null,
    promptKo: typeof parsed.promptKo === "string" ? parsed.promptKo : null,
    choices: Array.isArray(parsed.choices) ? parsed.choices : [],
  });
}
