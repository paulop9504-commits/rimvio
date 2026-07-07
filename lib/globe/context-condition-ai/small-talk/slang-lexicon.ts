import type { SmallTalkTopic } from "@/lib/globe/context-condition-ai/resolve-small-talk";

/**
 * Slang / neologism seed lexicon.
 *
 * We do NOT hardcode a canned answer per slang term. Instead each entry maps a
 * term to its *meaning* + the small-talk topic it belongs to, so the composer/LLM
 * respond by mood & intent (킹받네 → mood_down → "무슨 일 있었어요?"). New slang
 * the user teaches us lives in the personal memory store, not here. This list is
 * just a warm start + a signal that "this looks like slang, treat it as chat".
 */

export type SlangEntry = {
  readonly term: string;
  readonly meaningKo: string;
  readonly topic: SmallTalkTopic;
};

export const SLANG_LEXICON: readonly SlangEntry[] = [
  // 일상 · 감정
  { term: "ㄱㅇㅇ", meaningKo: "귀여워", topic: "mood_up" },
  { term: "어쩔티비", meaningKo: "어쩌라고(가벼운 무시·반박)", topic: "filler" },
  { term: "알잘딱깔센", meaningKo: "알아서 잘 딱 깔끔하고 센스 있게", topic: "mood_up" },
  { term: "오히려 좋아", meaningKo: "전화위복, 오히려 잘된 상황", topic: "mood_up" },
  { term: "오히려좋아", meaningKo: "전화위복, 오히려 잘된 상황", topic: "mood_up" },
  // 소통 · 공감
  { term: "ㅇㅈ", meaningKo: "인정(강한 동의)", topic: "ack" },
  { term: "잼민이", meaningKo: "철없는·귀여운 대상을 가볍게 지칭", topic: "catch_up" },
  { term: "내또출", meaningKo: "내일 또 출근(퇴근 무렵 애환)", topic: "time_state" },
  { term: "반모", meaningKo: "반말 모드(친구처럼 반말하기)", topic: "greeting" },
  // 상태 · 상황
  { term: "갓생", meaningKo: "God+생, 생산적이고 모범적인 삶", topic: "mood_up" },
  { term: "스불재", meaningKo: "스스로 불러온 재앙(자조)", topic: "mood_down" },
  { term: "킹받네", meaningKo: "열받네의 강조", topic: "mood_down" },
  { term: "킹받", meaningKo: "열받네의 강조", topic: "mood_down" },
  // 흔한 확장
  { term: "꿀잼", meaningKo: "매우 재미있음", topic: "mood_up" },
  { term: "노잼", meaningKo: "재미없음", topic: "mood_down" },
  { term: "현타", meaningKo: "현실 자각 타임(허탈)", topic: "mood_down" },
  { term: "일코", meaningKo: "일반인 코스프레(취향 숨기기)", topic: "catch_up" },
];

/** Match a known slang term inside the message (longest term wins). */
export function detectSlangTopic(text: string): SlangEntry | null {
  const t = text.trim();
  if (!t) {
    return null;
  }
  let best: SlangEntry | null = null;
  for (const entry of SLANG_LEXICON) {
    if (t.includes(entry.term)) {
      if (!best || entry.term.length > best.term.length) {
        best = entry;
      }
    }
  }
  return best;
}

const JAMO_CLUSTER = /[ㄱ-ㅎ]{2,}/u;
const LAUGH_CLUSTER = /^[ㅋㅎ]+$/u;

/**
 * A conservative "this looks like slang I don't know" signal: an initial-consonant
 * cluster (ㅇㅁㅊ 류) that isn't in the lexicon and isn't just laughter. Kept tight
 * so we only admit-and-ask when it's genuinely opaque, not for normal words.
 */
export function looksLikeUnknownSlang(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 12 || detectSlangTopic(t)) {
    return false;
  }
  const match = t.match(JAMO_CLUSTER);
  if (!match || !match[0]) {
    return false;
  }
  // A ㅋㅋ / ㅎㅎ cluster is laughter, not an unknown word.
  return !LAUGH_CLUSTER.test(match[0]);
}

/** The token to echo back when asking what a slang term means. */
export function extractUnknownSlangTerm(text: string): string {
  const t = text.trim();
  const match = t.match(JAMO_CLUSTER);
  if (match && match[0]) {
    return match[0];
  }
  return t.length <= 16 ? t : t.slice(0, 16);
}
