/**
 * Deterministic multi-intent atom parser — contrast (말고) + conjunction (하고).
 * Reject atoms are preserved (not stripped).
 */

import type {
  IntentAtom,
  IntentAtomFamily,
  ParsedNlIntentChain,
} from "@/lib/action-planner/intent-atom-types";
import { parseOrdinalIndex } from "@/lib/graph-command/resolve-selection-ref";
import type { IntentFamily } from "@/lib/rule-engine/constitution";

function normalize(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

function familyFromCue(cue: string): IntentAtomFamily | null {
  const t = cue.trim();
  if (!t) {
    return null;
  }
  if (
    /그거|이거|저거|그것|이것|저것|첫\s*(?:번\s*)?째|두\s*(?:번\s*)?째|세\s*(?:번\s*)?째|\d+\s*번/iu.test(
      t,
    ) &&
    !/예약|결제|길|공유|찾|삭제|옮겨|필터|싸게/iu.test(t)
  ) {
    return "Select";
  }
  if (/결제|구매|pay|purchase/iu.test(t)) {
    return "Purchase";
  }
  if (/예약|예매|잡아|부킹|reserve/iu.test(t)) {
    return "Reserve";
  }
  if (/공유|카톡|링크로|share/iu.test(t)) {
    return "Share";
  }
  if (/길|내비|지도|택시|지하철|도보|navigate/iu.test(t)) {
    return "Navigate";
  }
  if (/옮겨|맥락으로/iu.test(t)) {
    return "Move";
  }
  if (/싸게|필터|걸러|남기|filter/iu.test(t)) {
    return "Filter";
  }
  if (/비교|compare|vs/iu.test(t)) {
    return "Compare";
  }
  if (/찾|검색|추천|보여|search|find/iu.test(t)) {
    return "Search";
  }
  if (/삭제|지워|빼|없애/iu.test(t)) {
    return "Delete";
  }
  if (/메모|적어/iu.test(t)) {
    return "Note";
  }
  if (/만들|생성|create/iu.test(t)) {
    return "Create";
  }
  if (parseOrdinalIndex(t) != null) {
    return "Select";
  }
  return null;
}

function selectionFromCue(cue: string): IntentAtom["selection"] {
  const ordinal = parseOrdinalIndex(cue);
  const deictic = /그거|이거|저거|그것|이것|저것/iu.test(cue);
  if (ordinal == null && !deictic) {
    return undefined;
  }
  return {
    ordinal: ordinal,
    deictic: deictic || undefined,
  };
}

function expandNavigateCue(cue: string): string {
  const t = cue.trim();
  if (/^길만$/iu.test(t) || /^길$/iu.test(t)) {
    return "길 찾아";
  }
  if (/길만/iu.test(t) && !/찾|내비/iu.test(t)) {
    return t.replace(/길만/iu, "길 찾아");
  }
  return t;
}

function atom(
  family: IntentAtomFamily,
  polarity: IntentAtom["polarity"],
  cueSpan: string,
  order: number,
): IntentAtom {
  const cue =
    polarity === "do" && family === "Navigate"
      ? expandNavigateCue(cueSpan)
      : cueSpan.trim();
  return {
    family,
    polarity,
    cueSpan: cue,
    selection: selectionFromCue(cue),
    order,
  };
}

function splitConjunction(text: string): string[] {
  const parts = text
    .split(/\s*(?:하고\s+|그리고\s+|,\s*|\s+다음에\s+|\s+후에\s+)/u)
    .map((p) => p.trim())
    .filter((p) => p.length >= 1);
  if (parts.length <= 1) {
    const seo = text.split(
      /(?<=(?:찾아|검색해|비교해|옮겨|필터해|남겨))\s*서\s+/u,
    );
    if (seo.length > 1) {
      return seo.map((p) => p.trim()).filter(Boolean);
    }
  }
  return parts.length > 0 ? parts : [text];
}

function parseContrast(text: string): IntentAtom[] | null {
  const m = text.match(
    /^(?:아니(?:요|야|오)?\s*)?(?:(.+?)\s+)?말고\s+(.+)$/iu,
  );
  if (!m?.[2]?.trim()) {
    return null;
  }
  let rejectedRaw = (m[1] ?? "").trim();
  const keptRaw = m[2].trim();
  if (!rejectedRaw) {
    return null;
  }

  rejectedRaw = rejectedRaw.replace(/(?:은|는|을|를|이|가)$/u, "").trim();
  const rejectFamily =
    familyFromCue(rejectedRaw) ?? familyFromCue(`${rejectedRaw} 예약`);
  const keepCue = expandNavigateCue(keptRaw);
  const keepFamily = familyFromCue(keepCue) ?? "Select";

  const atoms: IntentAtom[] = [];
  if (rejectFamily) {
    atoms.push(atom(rejectFamily, "reject", rejectedRaw, 0));
  }
  atoms.push(atom(keepFamily, "do", keepCue, 1));
  return atoms;
}

function expandCompoundFragment(part: string): string[] {
  const t = part.trim();
  if (/찾아|검색/iu.test(t) && /결제|구매/iu.test(t)) {
    return ["숙소 찾아줘", "결제해"];
  }
  if (/찾아|검색/iu.test(t) && /예약/iu.test(t)) {
    return ["숙소 찾아줘", "예약해"];
  }
  if (/옮겨/iu.test(t) && /공유/iu.test(t)) {
    return ["옮겨줘", "공유해"];
  }
  if (/비교/iu.test(t) && /싸게|필터|남기/iu.test(t)) {
    return ["비교해 봐", "싸게만"];
  }
  if (/싸게|필터|남기/iu.test(t) && /길|내비/iu.test(t)) {
    return ["싸게만", "길 찾아"];
  }
  const seo = t.split(/(?<=(?:찾아|검색해|비교해|옮겨|필터해|남겨))\s*서\s+/u);
  if (seo.length > 1) {
    return seo.map((p) => p.trim()).filter(Boolean);
  }
  return [t];
}

function parseConjunction(text: string): IntentAtom[] | null {
  const parts = splitConjunction(text).flatMap(expandCompoundFragment);
  if (parts.length < 2) {
    return null;
  }
  const atoms: IntentAtom[] = [];
  let order = 0;
  for (const part of parts) {
    const family = familyFromCue(part);
    if (!family) {
      continue;
    }
    atoms.push(atom(family, "do", part, order));
    order += 1;
  }
  return atoms.length >= 2 ? atoms : null;
}

/**
 * Parse utterance into ordered keep/reject atoms.
 * Empty / single-do without reject → isMulti false (legacy path).
 */
export function parseNlIntentChain(utterance: string): ParsedNlIntentChain {
  const text = normalize(utterance);
  if (!text) {
    return { atoms: [], isMulti: false };
  }

  const fromContrast = parseContrast(text);
  if (fromContrast && fromContrast.length >= 1) {
    const isMulti =
      fromContrast.some((a) => a.polarity === "reject") ||
      fromContrast.filter((a) => a.polarity === "do").length >= 2;
    return { atoms: fromContrast, isMulti };
  }

  const fromAnd = parseConjunction(text);
  if (fromAnd) {
    return { atoms: fromAnd, isMulti: true };
  }

  const family = familyFromCue(text);
  if (!family) {
    return { atoms: [], isMulti: false };
  }
  return {
    atoms: [atom(family, "do", text, 0)],
    isMulti: false,
  };
}

export function shouldRunMultiIntentPlanner(
  chain: ParsedNlIntentChain,
): boolean {
  return chain.isMulti;
}

/** Map atom family to IntentFamily for Rule Engine notes (Select → Unknown). */
export function intentFamilyFromAtom(
  family: IntentAtomFamily,
): IntentFamily {
  if (family === "Select") {
    return "Unknown";
  }
  return family;
}
