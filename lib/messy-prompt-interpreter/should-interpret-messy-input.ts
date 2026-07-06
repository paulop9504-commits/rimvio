import { normalizeMessyInput } from "@/lib/messy-prompt-interpreter/normalize-messy-input";

const MENTION_PREFIX = /^@\S/u;
const URL_ONLY = /^https?:\/\/\S+$/iu;
const OPERATOR_PREFIX = /^(?:\/|#)/u;

/** Skip interpreter for structured / already-clean composer input. */
export function shouldInterpretMessyInput(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.length < 8) {
    return false;
  }
  if (MENTION_PREFIX.test(trimmed) || OPERATOR_PREFIX.test(trimmed)) {
    return false;
  }
  if (URL_ONLY.test(trimmed)) {
    return false;
  }

  const { original, normalized, collapsed } = normalizeMessyInput(trimmed);
  if (!normalized) {
    return false;
  }

  const noisy =
    original.length - normalized.length >= 3 ||
    /(?:ㅠ|ㅜ|ㅋ|ㅎ|ㅇㅇ|ㄱㄱ|개같|시발|씨발|fuck|shit)/iu.test(original) ||
    /(?:음|어+|아+|흠|그냥|일단|진짜|literally|um|uh)/iu.test(original) ||
    original.replace(/\s/gu, "").length !== normalized.replace(/\s/gu, "").length;

  const domainSignal =
    /(?:맛집|숙소|호텔|여행|체크인|길찾|미팅|일정|근처|예산|비싼|저렴|리스크|짐|버그|코드)/iu.test(
      collapsed,
    );

  return noisy || domainSignal;
}
