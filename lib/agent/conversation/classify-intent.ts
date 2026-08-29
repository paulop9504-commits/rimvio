/**
 * classifyIntent — utterance → UserIntent (deterministic, no Tool calls).
 */

import type { ClassifiedIntent, ConversationContext, UserIntent } from "@/lib/agent/conversation/intent-types";

const CHAT_PATTERNS = [
  /^ㅎㅇ$/i,
  /^하이$/i,
  /^헬로$/i,
  /^hello$/i,
  /^hi$/i,
  /^hey$/i,
  /^안녕$/i,
  /^안녕하세요$/i,
  /^안녕하세용$/i,
  /^반가워$/i,
  /^굿모닝$/i,
  /^good\s*morning$/i,
];

const CHAT_LOOSE = /^(ㅎㅇ+|ㅋㅋ+|ㅎㅎ+|뭐해\??|잘\s*지내\??)$/i;

const QUESTION_PATTERNS = [
  /무엇을\s*할\s*수\s*있/,
  /뭐\s*할\s*수\s*있/,
  /뭘\s*할\s*수\s*있/,
  /what\s*can\s*you\s*do/i,
  /help\s*me/i,
  /도와줄\s*수\s*있/,
  /기능이\s*뭐/,
  /뭐야\??$/,
  /뭔가요\??$/,
  /알려줘$/,
  /설명해/,
  /what\s*is/i,
  /who\s*are\s*you/i,
  /너\s*누구/,
];

const INSPECT_PATTERNS = [
  /현재\s*(플랫폼|상태|프로젝트|workspace)/,
  /플랫폼\s*(상태|확인|점검|분석)/,
  /상태\s*확인/,
  /workspace\s*inspect/i,
  /inspect\s*platform/i,
  /현황\s*알려/,
  /지금\s*뭐\s*있/,
  /capabilities?\s*list/i,
  /capability\s*확인/,
  /분석해\s*줘/,
];

const CONNECT_PATTERNS = [
  /github\s*연결/i,
  /github에\s*연결/i,
  /git\s*hub/i,
  /깃허브\s*연결/i,
  /깃허브연결/i,
  /깃허브/i,
  /레포\s*연결/i,
  /repository\s*connect/i,
  /vercel\s*연결/i,
  /버셀/i,
  /supabase\s*연결/i,
  /수파베이스/i,
  /stripe\s*연결/i,
  /connect\s*stripe/i,
  /stripe\s*connect/i,
  /스트라이프/i,
  /결제\s*연결/,
  /oauth/i,
  /연결해\s*줘/,
  /연결\s*해\s*줘/,
  /연결\s*해$/i,
  /연결$/i,
];

const TEST_PATTERNS = [
  /테스트\s*(돌|실|해|실행)/,
  /test\s*run/i,
  /run\s*test/i,
  /sandbox/i,
  /검증\s*해/,
  /verify\s*test/i,
];

const PUBLISH_PATTERNS = [
  /배포\s*해/,
  /publish/i,
  /출시\s*해/,
  /production/i,
  /프로덕션/,
  /라이브\s*배포/,
];

const CREATE_VAGUE_PATTERNS = [
  /새로\s*(플랫폼|프로젝트)/,
  /플랫폼을?\s*(개발|만들)/,
  /새\s*플랫폼/,
  /platform\s*from\s*scratch/i,
  /new\s*platform/i,
];

const CREATE_SPECIFIC_PATTERNS = [
  /만들어\s*줘/,
  /생성\s*해/,
  /create/i,
  /build\s/i,
  /부터\s*.*까지\s*만/,
  /회원가입부터/,
  /호텔\s*예약\s*플랫폼/,
  /여행자.*플랫폼/,
];

const MODIFY_PATTERNS = [
  /추가\s*해\s*줘/,
  /추가해/,
  /수정해/,
  /변경해/,
  /업데이트/,
  /고쳐/,
  /fix/i,
  /patch/i,
  /넣어\s*줘/,
  /켜\s*줘/,
  /확인하게\s*해/,
  /정렬/,
  /스키마/,
  /capability/i,
  /결제/,
  /payment/i,
  /호텔/,
  /hotel/i,
  /booking/i,
  /workflow/i,
  /워크플/,
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function classifyIntent(
  utterance: string,
  _context?: ConversationContext,
): ClassifiedIntent {
  const text = normalize(utterance);
  const lower = text.toLowerCase();

  if (!text) {
    return { intent: "chat", confidence: "high", reason: "empty" };
  }

  for (const p of CHAT_PATTERNS) {
    if (p.test(text)) {
      return { intent: "chat", confidence: "high", reason: "greeting" };
    }
  }
  if (CHAT_LOOSE.test(text)) {
    return { intent: "chat", confidence: "high", reason: "casual" };
  }

  if (CONNECT_PATTERNS.some((p) => p.test(text))) {
    return { intent: "connect", confidence: "high", reason: "connection_request" };
  }

  if (PUBLISH_PATTERNS.some((p) => p.test(text))) {
    return { intent: "publish", confidence: "high", reason: "publish_request" };
  }

  if (TEST_PATTERNS.some((p) => p.test(text))) {
    return { intent: "test", confidence: "high", reason: "test_request" };
  }

  if (INSPECT_PATTERNS.some((p) => p.test(text))) {
    return { intent: "inspect", confidence: "high", reason: "explicit_inspect" };
  }

  if (/@[a-z][a-z0-9_.]+/i.test(text) || /[a-z0-9_/-]+\.(ts|tsx)\b/i.test(text)) {
    return { intent: "modify", confidence: "high", reason: "code_direct" };
  }

  if (QUESTION_PATTERNS.some((p) => p.test(text)) && !MODIFY_PATTERNS.some((m) => m.test(text))) {
    return { intent: "question", confidence: "high", reason: "informational_question" };
  }

  if (CREATE_VAGUE_PATTERNS.some((p) => p.test(text))) {
    return { intent: "create", confidence: "high", reason: "vague_create" };
  }

  if (MODIFY_PATTERNS.some((p) => p.test(text))) {
    return { intent: "modify", confidence: "high", reason: "modify_request" };
  }

  if (/취소|환불|refund|cancel/i.test(text) && /예약|booking|payment/i.test(text)) {
    return { intent: "modify", confidence: "high", reason: "workflow_modify" };
  }

  if (CREATE_SPECIFIC_PATTERNS.some((p) => p.test(text))) {
    return { intent: "create", confidence: "high", reason: "create_request" };
  }

  if (lower.endsWith("?") || lower.includes("뭐야") || lower.includes("무엇")) {
    return { intent: "question", confidence: "medium", reason: "question_mark" };
  }

  if (text.length <= 4 && /^[ㄱ-ㅎㅏ-ㅣ가-힣a-z]+$/i.test(text)) {
    return { intent: "chat", confidence: "medium", reason: "short_utterance" };
  }

  // Fail-closed: ambiguous utterances do NOT auto-execute
  return { intent: "question", confidence: "low", reason: "ambiguous_no_execute" };
}

export function isExecutableIntent(intent: UserIntent): boolean {
  return intent !== "chat" && intent !== "question";
}
