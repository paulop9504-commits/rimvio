/**
 * Readability normalizer for foreign (esp. Japanese) place names.
 *
 * Naver local search returns raw JP shop names like "&ISLAND アンドアイランド 北浜"
 * which are hard to read for Korean users. This picks the most legible surface
 * deterministically (offline):
 *   1. Korean already present → keep as-is.
 *   2. A meaningful Latin/ASCII segment → prefer it (e.g. "&ISLAND").
 *   3. Kana → romaji transliteration.
 *   4. Kanji-only → keep original (safe fallback; no dictionary here).
 */

const HANGUL = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/u;
const KANA = /[\u3040-\u309F\u30A0-\u30FF]/u;
const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF]/u;

// Basic Hepburn-ish kana → romaji. Digraphs first, then base syllables.
const KANA_ROMAJI: [RegExp, string][] = [
  [/きゃ|キャ/gu, "kya"], [/きゅ|キュ/gu, "kyu"], [/きょ|キョ/gu, "kyo"],
  [/しゃ|シャ/gu, "sha"], [/しゅ|シュ/gu, "shu"], [/しょ|ショ/gu, "sho"],
  [/ちゃ|チャ/gu, "cha"], [/ちゅ|チュ/gu, "chu"], [/ちょ|チョ/gu, "cho"],
  [/にゃ|ニャ/gu, "nya"], [/にゅ|ニュ/gu, "nyu"], [/にょ|ニョ/gu, "nyo"],
  [/ひゃ|ヒャ/gu, "hya"], [/ひゅ|ヒュ/gu, "hyu"], [/ひょ|ヒョ/gu, "hyo"],
  [/みゃ|ミャ/gu, "mya"], [/みゅ|ミュ/gu, "myu"], [/みょ|ミョ/gu, "myo"],
  [/りゃ|リャ/gu, "rya"], [/りゅ|リュ/gu, "ryu"], [/りょ|リョ/gu, "ryo"],
  [/ぎゃ|ギャ/gu, "gya"], [/ぎゅ|ギュ/gu, "gyu"], [/ぎょ|ギョ/gu, "gyo"],
  [/じゃ|ジャ/gu, "ja"], [/じゅ|ジュ/gu, "ju"], [/じょ|ジョ/gu, "jo"],
  [/びゃ|ビャ/gu, "bya"], [/びゅ|ビュ/gu, "byu"], [/びょ|ビョ/gu, "byo"],
  [/ぴゃ|ピャ/gu, "pya"], [/ぴゅ|ピュ/gu, "pyu"], [/ぴょ|ピョ/gu, "pyo"],
  [/あ|ア/gu, "a"], [/い|イ/gu, "i"], [/う|ウ/gu, "u"], [/え|エ/gu, "e"], [/お|オ/gu, "o"],
  [/か|カ/gu, "ka"], [/き|キ/gu, "ki"], [/く|ク/gu, "ku"], [/け|ケ/gu, "ke"], [/こ|コ/gu, "ko"],
  [/が|ガ/gu, "ga"], [/ぎ|ギ/gu, "gi"], [/ぐ|グ/gu, "gu"], [/げ|ゲ/gu, "ge"], [/ご|ゴ/gu, "go"],
  [/さ|サ/gu, "sa"], [/し|シ/gu, "shi"], [/す|ス/gu, "su"], [/せ|セ/gu, "se"], [/そ|ソ/gu, "so"],
  [/ざ|ザ/gu, "za"], [/じ|ジ/gu, "ji"], [/ず|ズ/gu, "zu"], [/ぜ|ゼ/gu, "ze"], [/ぞ|ゾ/gu, "zo"],
  [/た|タ/gu, "ta"], [/ち|チ/gu, "chi"], [/つ|ツ/gu, "tsu"], [/て|テ/gu, "te"], [/と|ト/gu, "to"],
  [/だ|ダ/gu, "da"], [/ぢ|ヂ/gu, "ji"], [/づ|ヅ/gu, "zu"], [/で|デ/gu, "de"], [/ど|ド/gu, "do"],
  [/な|ナ/gu, "na"], [/に|ニ/gu, "ni"], [/ぬ|ヌ/gu, "nu"], [/ね|ネ/gu, "ne"], [/の|ノ/gu, "no"],
  [/は|ハ/gu, "ha"], [/ひ|ヒ/gu, "hi"], [/ふ|フ/gu, "fu"], [/へ|ヘ/gu, "he"], [/ほ|ホ/gu, "ho"],
  [/ば|バ/gu, "ba"], [/び|ビ/gu, "bi"], [/ぶ|ブ/gu, "bu"], [/べ|ベ/gu, "be"], [/ぼ|ボ/gu, "bo"],
  [/ぱ|パ/gu, "pa"], [/ぴ|ピ/gu, "pi"], [/ぷ|プ/gu, "pu"], [/ぺ|ペ/gu, "pe"], [/ぽ|ポ/gu, "po"],
  [/ま|マ/gu, "ma"], [/み|ミ/gu, "mi"], [/む|ム/gu, "mu"], [/め|メ/gu, "me"], [/も|モ/gu, "mo"],
  [/や|ヤ/gu, "ya"], [/ゆ|ユ/gu, "yu"], [/よ|ヨ/gu, "yo"],
  [/ら|ラ/gu, "ra"], [/り|リ/gu, "ri"], [/る|ル/gu, "ru"], [/れ|レ/gu, "re"], [/ろ|ロ/gu, "ro"],
  [/わ|ワ/gu, "wa"], [/を|ヲ/gu, "wo"], [/ん|ン/gu, "n"],
  [/ー/gu, ""], [/っ|ッ/gu, ""],
];

function romanizeKana(text: string): string {
  let out = text;
  for (const [re, romaji] of KANA_ROMAJI) {
    out = out.replace(re, romaji);
  }
  return out;
}

/** Extract a legible ASCII/Latin segment (letters/digits/&/·), if substantial. */
function extractLatinSegment(text: string): string | null {
  const matches = text.match(/[A-Za-z0-9&][A-Za-z0-9&'.\- ]*/gu);
  if (!matches) {
    return null;
  }
  const best = matches
    .map((seg) => seg.trim())
    .filter((seg) => /[A-Za-z]{2,}/u.test(seg))
    .sort((a, b) => b.length - a.length)[0];
  return best ?? null;
}

/** Best-effort readable label for a place name. Deterministic + offline. */
export function toReadablePlaceLabel(
  raw: string | null | undefined,
): string {
  const text = (raw ?? "").trim();
  if (!text) {
    return "";
  }
  if (HANGUL.test(text)) {
    return text;
  }
  // Prefer a bundled Latin/English name when present.
  const latin = extractLatinSegment(text);
  if (latin && !KANA.test(latin) && !CJK.test(latin)) {
    return latin;
  }
  // Kana → romaji so it can at least be read.
  if (KANA.test(text) && !CJK.test(text.replace(KANA, ""))) {
    const romaji = romanizeKana(text)
      .replace(/[\u3040-\u30FF]/gu, "")
      .replace(/\s+/gu, " ")
      .trim();
    if (romaji && /[A-Za-z]{2,}/u.test(romaji)) {
      return romaji.replace(/\b\w/gu, (c) => c.toUpperCase());
    }
  }
  // Kanji-only or unresolved → keep original (safe).
  return text;
}
