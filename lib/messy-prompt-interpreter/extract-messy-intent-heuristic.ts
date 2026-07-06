import { normalizeMessyInput } from "@/lib/messy-prompt-interpreter/normalize-messy-input";
import type {
  ExtractedMessyIntent,
  MessyPromptDomain,
  MessyPromptExtractInput,
  MessyPromptObjective,
  MessyPromptUrgency,
} from "@/lib/messy-prompt-interpreter/types";

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function extractTimeWindow(text: string): string | null {
  const range = text.match(
    /(\d{1,2})\s*(?:시|:)\s*(?:~|-|부터)?\s*(\d{1,2})?\s*시?/u,
  );
  if (range) {
    const start = range[1]!.padStart(2, "0");
    const end = range[2] ? range[2].padStart(2, "0") : null;
    return end ? `${start}:00-${end}:00` : `${start}:00`;
  }
  const single = text.match(/(\d{1,2})\s*시/u);
  if (single) {
    return `${single[1]!.padStart(2, "0")}:00`;
  }
  return null;
}

function inferDomain(text: string): MessyPromptDomain {
  if (includesAny(text, [/코드|버그|react|typescript|배포|커밋|pr\b|api/ui])) {
    return "coding_task";
  }
  if (
    includesAny(text, [/여행|공항|airport|trip/iu]) ||
    (includesAny(text, [/체크인/u]) && includesAny(text, [/짐|리스크|공항/u]))
  ) {
    return "travel_planning";
  }
  if (includesAny(text, [/숙소|호텔|체크인|체크아웃|잠|stay|lodging/iu])) {
    return "lodging";
  }
  if (includesAny(text, [/맛집|밥|식사|저녁|점심|먹|restaurant|food/iu])) {
    return "eatery";
  }
  if (includesAny(text, [/길찾|내비|네비|route|navigation|택시|이동/iu])) {
    return "navigation";
  }
  if (includesAny(text, [/미팅|회의|일정|약속|schedule|calendar/iu])) {
    return "schedule";
  }
  if (includesAny(text, [/여행|짐|리스크|travel/iu])) {
    return "travel_planning";
  }
  return "general";
}

function inferObjective(text: string, domain: MessyPromptDomain): MessyPromptObjective {
  if (includesAny(text, [/리스크|위험|안전|무리|빡빡/iu])) {
    return "minimize_risk";
  }
  if (includesAny(text, [/비싼|저렴|가격|돈|예산|cheap|budget/iu])) {
    return "reduce_cost";
  }
  if (includesAny(text, [/빨리|급|늦|asap|urgent/iu])) {
    return "maximize_efficiency";
  }
  if (includesAny(text, [/근처|주변|nearby|가까운/iu])) {
    return "find_nearby";
  }
  if (includesAny(text, [/버그|안됨|안돼|고쳐|fix|broken/iu])) {
    return "fix_problem";
  }
  if (/알아서|몰라/iu.test(text)) {
    return "clarify_and_act";
  }
  if (includesAny(text, [/짜|플랜|계획|순서|plan|schedule/iu])) {
    return "plan_sequence";
  }
  return domain === "general" ? "unknown" : "plan_sequence";
}

function inferUrgency(text: string): MessyPromptUrgency {
  if (includesAny(text, [/지금|바로|빨리|급|늦|asap|urgent/iu])) {
    return "high";
  }
  if (includesAny(text, [/오늘|내일|이번|soon/iu])) {
    return "medium";
  }
  return "low";
}

function extractEntities(text: string): string[] {
  const entities = new Set<string>();
  const placeMatches = text.match(
    /(?:공항|역|호텔|강남|오사카|도쿄|서울|부산|제주|airport)[^\s,.]*/giu,
  );
  for (const match of placeMatches ?? []) {
    entities.add(match.trim());
  }
  if (/공항/u.test(text)) {
    entities.add("공항");
  }
  if (/짐|캐리어/u.test(text)) {
    entities.add("짐");
  }
  return [...entities];
}

function buildConstraints(text: string): string[] {
  const constraints: string[] = [];
  if (/리스크|위험|안전/iu.test(text)) {
    constraints.push("리스크 최소화");
  }
  if (/비싼|고가/iu.test(text)) {
    constraints.push("고가 옵션 제외");
  }
  if (/짐|캐리어|무거/iu.test(text)) {
    constraints.push("짐 이동 부담 고려");
  }
  if (/체크인|(\d{1,2})\s*시/u.test(text)) {
    const time = extractTimeWindow(text);
    if (time) {
      constraints.push(`체크인/시간 창: ${time}`);
    }
  }
  if (/날씨|(?:^|\s)비(?:\s|$)|눈|우산/iu.test(text)) {
    constraints.push("날씨 불확실성 반영");
  }
  if (/장거리|멀리/iu.test(text)) {
    constraints.push("장거리 이동 회피");
  }
  return constraints;
}

function buildPreferences(text: string): string[] {
  const preferences: string[] = [];
  if (/안정|여유|느긋/iu.test(text)) {
    preferences.push("안정성 우선");
  }
  if (/효율|빠르/iu.test(text)) {
    preferences.push("효율 우선");
  }
  if (/근처|가까/iu.test(text)) {
    preferences.push("근거리 선호");
  }
  if (/알아서/iu.test(text)) {
    preferences.push("기본값으로 빠르게 결정");
  }
  return preferences;
}

function buildTaskLabel(domain: MessyPromptDomain, text: string): string {
  switch (domain) {
    case "travel_planning":
      return "여행 동선·대기 계획";
    case "lodging":
      return "숙소 맞추기";
    case "eatery":
      return "식사·맛집 맞추기";
    case "navigation":
      return "이동·길찾기";
    case "schedule":
      return "일정·약속 대응";
    case "coding_task":
      return "코드·버그 해결";
    default:
      return text.length > 24 ? `${text.slice(0, 24)}…` : text || "요청 처리";
  }
}

function buildGoalKo(objective: MessyPromptObjective, domain: MessyPromptDomain): string {
  const map: Record<MessyPromptObjective, string> = {
    minimize_risk: "리스크를 줄이는 방향으로 맞추기",
    maximize_efficiency: "가장 빠르고 효율적으로 처리",
    reduce_cost: "비용 부담을 줄이기",
    find_nearby: "가까운 후보 위주로 찾기",
    fix_problem: "문제 원인을 찾아 고치기",
    plan_sequence: "단계별 실행 순서 짜기",
    clarify_and_act: "불명확해도 합리적 기본값으로 진행",
    unknown: "의도를 정리한 뒤 다음 행동 제안",
  };
  if (domain === "coding_task" && objective === "fix_problem") {
    return "버그를 재현·수정 가능한 작업으로 정리";
  }
  return map[objective];
}

function buildAssumptions(
  domain: MessyPromptDomain,
  text: string,
  situation?: Record<string, string | number | boolean | null>,
): string[] {
  const assumptions: string[] = [];
  if (situation?.location) {
    assumptions.push(`현재 위치 힌트: ${String(situation.location)}`);
  }
  if (domain === "travel_planning" && /공항/u.test(text)) {
    assumptions.push("공항 대기/환승 맥락으로 해석");
  }
  if (/알아서|몰라/iu.test(text)) {
    assumptions.push("세부 취향 미지 — 기본 안전·효율 프리셋 적용");
  }
  if (domain === "eatery" && !/시간|점심|저녁/u.test(text)) {
    assumptions.push("다음 식사 시간대로 가정");
  }
  return assumptions;
}

function buildAmbiguities(text: string, domain: MessyPromptDomain): string[] {
  const ambiguities: string[] = [];
  if (domain === "general" && text.length < 8) {
    ambiguities.push("요청이 너무 짧아 목표가 불명확함");
  }
  if (/이거|그거|저거/u.test(text) && !/공항|숙소|미팅|코드/u.test(text)) {
    ambiguities.push("지시 대상(이거)이 문맥 없이 모호함");
  }
  if (/내일|모레/u.test(text) && !/\d{1,2}\s*시/u.test(text)) {
    ambiguities.push("정확한 시간 미지정");
  }
  return ambiguities;
}

function scoreConfidence(
  text: string,
  domain: MessyPromptDomain,
  ambiguities: string[],
): number {
  let score = 0.55;
  if (text.length >= 12) {
    score += 0.1;
  }
  if (domain !== "general") {
    score += 0.15;
  }
  if (ambiguities.length === 0) {
    score += 0.1;
  } else {
    score -= ambiguities.length * 0.08;
  }
  if (/알아서|몰라|아무거나/iu.test(text)) {
    score -= 0.05;
  }
  return Math.max(0.35, Math.min(0.95, score));
}

/** Rule-based intent extraction — always available, no network. */
export function extractMessyIntentHeuristic(
  input: MessyPromptExtractInput,
): ExtractedMessyIntent {
  const { original, normalized, collapsed } = normalizeMessyInput(input.message);
  const text = normalized || original;
  const probe = `${normalized} ${collapsed}`.trim();

  const domain = inferDomain(probe);
  const objective = inferObjective(probe, domain);
  const constraints = buildConstraints(probe);
  const preferences = buildPreferences(probe);
  const entities = extractEntities(probe);
  const ambiguities = buildAmbiguities(probe, domain);
  const assumptions = buildAssumptions(domain, probe, input.situation);

  const stateHints: Record<string, string | number | boolean> = {};
  const timeWindow = extractTimeWindow(probe);
  if (timeWindow) {
    stateHints.time_window = timeWindow;
  }
  if (/공항/u.test(probe)) {
    stateHints.location = "airport";
  }
  if (/짐|캐리어/u.test(probe)) {
    stateHints.luggage = true;
  }
  if (/피곤|졸|힘들/iu.test(probe)) {
    stateHints.fatigue_level = "medium";
  }
  if (input.situation) {
    for (const [key, value] of Object.entries(input.situation)) {
      if (value != null && stateHints[key] == null) {
        stateHints[key] =
          typeof value === "boolean" || typeof value === "number"
            ? value
            : String(value);
      }
    }
  }

  const confidence = scoreConfidence(probe, domain, ambiguities);

  return {
    raw: original,
    normalized: text,
    domain,
    objective,
    taskLabelKo: buildTaskLabel(domain, text),
    goalKo: buildGoalKo(objective, domain),
    constraints,
    preferences,
    entities,
    stateHints,
    urgency: inferUrgency(probe),
    confidence,
    assumptions,
    ambiguities,
  };
}
