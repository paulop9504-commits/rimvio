export type GlobeAiIntentFallbackKind =
  | "personal_context_ask"
  | "text_ingest";

export type GlobeAiIntentFallback = {
  kind: GlobeAiIntentFallbackKind;
  reason:
    | "greeting"
    | "question"
    | "summary"
    | "compare"
    | "plan"
    | "write"
    | "raw_url"
    | "note"
    | "default";
};

const GREETING_RE =
  /^(?:ㅎㅇ|하이|안녕|안뇽|반가워|hello|hi|hey|yo|sup)(?:[.!?~\s]*)$/iu;

const RAW_URL_ONLY_RE = /^https?:\/\/[^\s]+$/iu;

const ASK_SIGNAL_RE =
  /[?？]|(?:뭐|무엇|어디|언제|누구|왜|어떻게|어떤|얼마|알려|추천|설명|보여|찾아|꺼내|도와|가능|좋을까|괜찮을까|어때)/u;

const SUMMARY_SIGNAL_RE =
  /(?:정리|요약|핵심|한\s*줄|쉽게\s*설명|풀어서\s*설명)/u;

const COMPARE_SIGNAL_RE =
  /(?:비교|차이|장단점|뭐가\s*더|어느\s*쪽|골라|판단|검토)/u;

const PLAN_SIGNAL_RE =
  /(?:일정|계획|루트|동선|플랜|준비물|정리해줘|짜줘|구성해줘)/u;

const WRITE_SIGNAL_RE =
  /(?:초안|문장|글|써줘|작성|정리문|소개글|설명문)/u;

const NOTE_SIGNAL_RE =
  /(?:메모|기록|남겨|적어|저장|붙여|먹음|먹었|봤음|봤어|다녀옴|도착|출발|완료|결제|예약|샀어|팔았|구했|만났어|회의했|정리함)/u;

function normalize(raw: string): string {
  return raw.trim();
}

function looksLikeQuestion(text: string): boolean {
  return (
    ASK_SIGNAL_RE.test(text) ||
    SUMMARY_SIGNAL_RE.test(text) ||
    COMPARE_SIGNAL_RE.test(text) ||
    PLAN_SIGNAL_RE.test(text) ||
    WRITE_SIGNAL_RE.test(text)
  );
}

function looksLikeNote(text: string): boolean {
  if (NOTE_SIGNAL_RE.test(text)) {
    return true;
  }
  if (looksLikeQuestion(text)) {
    return false;
  }
  return /(?:했어|했음|먹음|봄|감|다녀옴|메모)$/u.test(text);
}

/** Final personal-composer fallback — prefer ask or ingest, never implicit market offer. */
export function classifyGlobeAiIntentFallback(raw: string): GlobeAiIntentFallback {
  const text = normalize(raw);
  if (!text) {
    return { kind: "personal_context_ask", reason: "default" };
  }
  if (RAW_URL_ONLY_RE.test(text)) {
    return { kind: "text_ingest", reason: "raw_url" };
  }
  if (GREETING_RE.test(text)) {
    return { kind: "personal_context_ask", reason: "greeting" };
  }
  if (SUMMARY_SIGNAL_RE.test(text)) {
    return { kind: "personal_context_ask", reason: "summary" };
  }
  if (COMPARE_SIGNAL_RE.test(text)) {
    return { kind: "personal_context_ask", reason: "compare" };
  }
  if (PLAN_SIGNAL_RE.test(text)) {
    return { kind: "personal_context_ask", reason: "plan" };
  }
  if (WRITE_SIGNAL_RE.test(text)) {
    return { kind: "personal_context_ask", reason: "write" };
  }
  if (ASK_SIGNAL_RE.test(text)) {
    return { kind: "personal_context_ask", reason: "question" };
  }
  if (looksLikeNote(text)) {
    return { kind: "text_ingest", reason: "note" };
  }
  return { kind: "personal_context_ask", reason: "default" };
}
