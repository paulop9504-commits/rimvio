import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPinContextNote } from "@/lib/globe/pin-context-note";
import { resolveContextPlaceLabel } from "@/lib/globe/context-hub/resolve-context-place-label";
import { buildRecallEventSnapshot } from "@/lib/recall/recall-event-snapshot";

const STOP = new Set([
  "그리고",
  "근데",
  "이번",
  "저번",
  "오늘",
  "내일",
  "있어",
  "있어요",
  "했어",
  "했어요",
  "좀",
  "너무",
  "the",
  "and",
]);

function tokenizeContext(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.!?·…—]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && !STOP.has(part));
}

function readEventBlob(event: EventCandidate): string {
  const snapshot = buildRecallEventSnapshot(event);
  const note = readPinContextNote(event);
  return [
    event.title,
    resolveContextPlaceLabel(event),
    event.description ?? "",
    snapshot.people.join(" "),
    note ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

const SYNONYM_GROUPS: readonly string[][] = [
  ["핸드폰", "아이폰", "iphone", "갤럭시", "galaxy", "폰"],
  ["캠핑", "텐트", "버너", "캠핑용품"],
  ["노트북", "맥북", "macbook", "랩탑"],
];

function countTokenHits(tokens: string[], blob: string): number {
  let hits = 0;
  for (const token of tokens) {
    if (blob.includes(token)) {
      hits += 1;
      continue;
    }
    for (const group of SYNONYM_GROUPS) {
      if (!group.includes(token)) {
        continue;
      }
      if (group.some((synonym) => synonym !== token && blob.includes(synonym))) {
        hits += 1;
        break;
      }
    }
  }
  return hits;
}

function scoreEventRelevance(event: EventCandidate, contextText: string): number {
  const tokens = tokenizeContext(contextText);
  if (tokens.length === 0) {
    return 0;
  }
  const blob = readEventBlob(event);
  const tokenHits = countTokenHits(tokens, blob);
  if (tokenHits === 0) {
    return 0;
  }
  let score = tokenHits * 2;
  const updatedMs = Date.parse(event.updatedAt);
  if (!Number.isNaN(updatedMs)) {
    const ageDays = (Date.now() - updatedMs) / 86_400_000;
    if (ageDays <= 7) {
      score += 2;
    } else if (ageDays <= 30) {
      score += 1;
    }
  }
  return score;
}

function formatMemoryLine(event: EventCandidate): string {
  const snapshot = buildRecallEventSnapshot(event);
  const parts = [event.title.trim()];
  const place = resolveContextPlaceLabel(event);
  if (place.trim()) {
    parts.push(`장소 ${place.trim()}`);
  }
  if (snapshot.people.length > 0) {
    parts.push(`함께 ${snapshot.people.join(", ")}`);
  }
  if (event.datetime?.trim()) {
    parts.push(`시점 ${event.datetime.trim().slice(0, 10)}`);
  }
  return `- ${parts.join(" · ")}`;
}

/**
 * Context-gated memory notes for compose chat LLM — only when relevant to current turn.
 */
export function buildComposeChatMemoryNotesKo(input: {
  events: readonly EventCandidate[];
  contextText: string;
  maxItems?: number;
}): string | null {
  const context = input.contextText.trim();
  if (!context) {
    return null;
  }

  const ranked = input.events
    .map((event) => ({ event, score: scoreEventRelevance(event, context) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.maxItems ?? 3);

  if (ranked.length === 0) {
    return null;
  }

  return ranked.map((row) => formatMemoryLine(row.event)).join("\n");
}
