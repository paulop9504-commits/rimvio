const KO_DIGIT: Record<string, number> = {
  일: 1,
  이: 2,
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
  구: 9,
};

const KO_UNIT: Record<string, number> = {
  십: 10,
  백: 100,
  천: 1_000,
  만: 10_000,
  억: 100_000_000,
};

function parseKoreanNumeralPhrase(text: string): number | null {
  const compact = text.replace(/\s+/gu, "");
  if (!compact || !/[만억천백십일이삼사오육칠팔구]/u.test(compact)) {
    return null;
  }

  let total = 0;
  let section = 0;
  let number = 0;

  for (const char of compact) {
    if (char in KO_DIGIT) {
      number = KO_DIGIT[char] ?? 0;
      continue;
    }
    if (char in KO_UNIT) {
      const unit = KO_UNIT[char] ?? 0;
      if (unit === 10_000 || unit === 100_000_000) {
        const base = section + number || 1;
        total += base * unit;
        section = 0;
        number = 0;
        continue;
      }
      number = (number || 1) * unit;
      section += number;
      number = 0;
      continue;
    }
    return null;
  }

  const value = total + section + number;
  return value > 0 ? value : null;
}

function normalizePriceText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[,\s]/gu, "")
    .replace(/₩/gu, "")
    .replace(/원{0,1}[어언웡웅]/gu, "원")
    .replace(/만{0,1}[어언웡웅]/gu, "만");
}

export type ParseComposePriceResult =
  | { ok: true; priceKrw: number; assumedManUnit?: boolean }
  | { ok: false; kind: "unparsed" };

const MIN_PRICE_KRW = 10_000;

function finish(value: number, assumedManUnit = false): ParseComposePriceResult {
  if (!Number.isFinite(value) || value < MIN_PRICE_KRW) {
    return { ok: false, kind: "unparsed" };
  }
  return { ok: true, priceKrw: Math.round(value), assumedManUnit };
}

/** Compose slot price — 70 · 70만원 · 700000 · 백만원 · 70만언 */
export function parseComposePriceKrw(raw: string): ParseComposePriceResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, kind: "unparsed" };
  }

  const embeddedMan = trimmed.match(/(\d+(?:\.\d+)?)\s*만(?:\s*원)?/iu);
  if (embeddedMan?.[1]) {
    const man = Number.parseFloat(embeddedMan[1]);
    if (Number.isFinite(man)) {
      return finish(man * 10_000);
    }
  }

  const embeddedWon = trimmed.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/iu);
  if (embeddedWon?.[1]) {
    const won = Number.parseInt(embeddedWon[1].replace(/,/g, ""), 10);
    if (Number.isFinite(won)) {
      return finish(won);
    }
  }

  const text = normalizePriceText(trimmed);
  if (!text) {
    return { ok: false, kind: "unparsed" };
  }

  const koCandidate = text.replace(/원$/u, "");
  if (koCandidate.length <= 16 && /^[일이삼사오육칠팔구십백천만억\d]+$/u.test(koCandidate)) {
    const koValue = parseKoreanNumeralPhrase(koCandidate);
    if (koValue != null) {
      return finish(koValue);
    }
  }

  const manMatch = text.match(/^(\d+(?:\.\d+)?)만(?:원)?$/u);
  if (manMatch?.[1]) {
    const man = Number.parseFloat(manMatch[1]);
    if (Number.isFinite(man)) {
      return finish(man * 10_000);
    }
  }

  const wonMatch = text.match(/^(\d+(?:\.\d+)?)원$/u);
  if (wonMatch?.[1]) {
    const won = Number.parseFloat(wonMatch[1]);
    if (Number.isFinite(won)) {
      return finish(won);
    }
  }

  if (/^\d+(?:\.\d+)?$/u.test(text)) {
    const digits = Number.parseFloat(text);
    if (!Number.isFinite(digits)) {
      return { ok: false, kind: "unparsed" };
    }
    if (digits >= 10_000) {
      return finish(digits);
    }
    if (digits >= 1) {
      return finish(digits * 10_000, true);
    }
  }

  return { ok: false, kind: "unparsed" };
}

export function parseComposePriceKrwOrNull(raw: string): number | null {
  const parsed = parseComposePriceKrw(raw);
  return parsed.ok ? parsed.priceKrw : null;
}

export function isPriceConfirmYes(text: string): boolean {
  return /^(?:네|예|응|맞아|맞아요|맞습니다|ㅇㅇ|yes|y|ok)$/iu.test(text.trim());
}

export function isPriceConfirmNo(text: string): boolean {
  return /^(?:아니|아니요|아님|다시|no|n)$/iu.test(text.trim());
}
