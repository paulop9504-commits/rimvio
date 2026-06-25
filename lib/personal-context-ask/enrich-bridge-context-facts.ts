import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readPinContextNote } from "@/lib/globe/pin-context-note";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const GENERIC_SPOT_LABELS = new Set([
  "사진",
  "동영상",
  "영상",
  "카페",
  "맛집",
  "식당",
  "점심",
  "저녁",
  "아침",
  "브런치",
  "좋았음",
  "추천",
  "기록",
  "메모",
]);

function hasKoreanBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) {
    return false;
  }
  return (code - 0xac00) % 28 !== 0;
}

function withGwaJosa(word: string): string {
  const trimmed = word.trim();
  if (!trimmed) {
    return "";
  }
  return hasKoreanBatchim(trimmed) ? `${trimmed}과` : `${trimmed}와`;
}

function joinKoreanAnd(items: readonly string[]): string {
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0]!;
  }
  const last = items[items.length - 1]!;
  const head = items.slice(0, -1).join(", ");
  const josa = hasKoreanBatchim(last) ? "과" : "와";
  return `${head} ${last}${josa}`;
}

function inferContextKind(title: string, category: string): string | null {
  const blob = `${title} ${category}`;
  if (/출장/u.test(blob)) {
    return "출장";
  }
  if (/여행/u.test(blob)) {
    return "여행";
  }
  if (/야경/u.test(blob)) {
    return "야경 투어";
  }
  if (/맛집|식당|레스토랑/u.test(blob)) {
    return "맛집";
  }
  if (/모임|약속/u.test(blob)) {
    return "모임";
  }
  return null;
}

function readSpotLabels(
  event: EventCandidate,
  mainPlace: string | null,
): string[] {
  const spots = new Set<string>();
  const main = mainPlace?.trim().toLowerCase() ?? "";

  for (const row of readFeedCaptureFragments(event)) {
    for (const candidate of [row.label, row.placeLabel]) {
      const label = candidate?.trim();
      if (!label || GENERIC_SPOT_LABELS.has(label)) {
        continue;
      }
      if (main && label.toLowerCase().includes(main)) {
        continue;
      }
      if (label.length >= 2 && label.length <= 24) {
        spots.add(label);
      }
    }
  }

  const note = readPinContextNote(event);
  if (note?.trim()) {
    for (const part of note.split(/[·,、/|]/u)) {
      const label = part.trim();
      if (!label || GENERIC_SPOT_LABELS.has(label)) {
        continue;
      }
      if (main && label.toLowerCase().includes(main)) {
        continue;
      }
      if (label.length >= 2 && label.length <= 20) {
        spots.add(label);
      }
    }
  }

  return [...spots].slice(0, 5);
}

/** Pure read — bridge card facts from stored event only. */
export function enrichBridgeContextFacts(
  event: EventCandidate,
  mainPlace: string | null,
): {
  contextKind: string | null;
  spotLabels: readonly string[];
  periodEndIso: string | null;
} {
  const plan = readPlanContextFromEvent(event);
  return {
    contextKind: inferContextKind(event.title, event.category),
    spotLabels: readSpotLabels(event, mainPlace),
    periodEndIso: plan?.windowEndIso?.trim() ?? null,
  };
}

export { hasKoreanBatchim, joinKoreanAnd, withGwaJosa };
