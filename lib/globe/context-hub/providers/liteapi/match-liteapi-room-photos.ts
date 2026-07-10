import type {
  LiteApiCaptionPhotoEntry,
  LiteApiRoomPhotoCatalogEntry,
} from "@/lib/globe/context-hub/providers/liteapi/liteapi-hotel-details-types";

const ROOM_STOP_WORDS = new Set([
  "room",
  "only",
  "bed",
  "and",
  "breakfast",
  "the",
  "with",
  "guest",
  "standard",
  "included",
  "board",
  "half",
  "full",
]);

const GENERIC_CAPTION_PATTERN =
  /\b(lobby|exterior|facade|pool|restaurant|bar|gym|spa|building|entrance|reception|view|aerial)\b/i;

/** Minimum token-overlap score for room-name fuzzy attach. */
export const LITEAPI_ROOM_NAME_MATCH_THRESHOLD = 0.5;

/** Slightly stricter for caption-based gallery matches. */
export const LITEAPI_CAPTION_MATCH_THRESHOLD = 0.55;

export function extractRateTitleBase(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return "";
  }
  const [base] = trimmed.split(/[·•|]/);
  return base?.trim() ?? trimmed;
}

export function normalizeRoomLabel(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/room only|bed and breakfast|breakfast included|half board|full board/gi, " ")
    .replace(/[·•|/\\–—-]/g, " ")
    .replace(
      /[^a-z0-9\s\u3130-\u318f\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeRoomLabel(value: string): string[] {
  return normalizeRoomLabel(value)
    .split(" ")
    .filter((token) => token.length > 1 && !ROOM_STOP_WORDS.has(token));
}

/** Deterministic room-name similarity — 0..1. */
export function scoreRoomNameMatch(left: string, right: string): number {
  const normalizedLeft = normalizeRoomLabel(left);
  const normalizedRight = normalizeRoomLabel(right);
  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }
  if (normalizedLeft === normalizedRight) {
    return 1;
  }
  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return 0.85;
  }

  const leftTokens = new Set(tokenizeRoomLabel(left));
  const rightTokens = new Set(tokenizeRoomLabel(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return overlap / union;
}

export function findBestRoomCatalogMatch(
  rateTitle: string,
  catalog: readonly LiteApiRoomPhotoCatalogEntry[],
  threshold = LITEAPI_ROOM_NAME_MATCH_THRESHOLD,
): LiteApiRoomPhotoCatalogEntry | null {
  const baseTitle = extractRateTitleBase(rateTitle);
  if (!baseTitle || catalog.length === 0) {
    return null;
  }

  let best: LiteApiRoomPhotoCatalogEntry | null = null;
  let bestScore = 0;

  for (const entry of catalog) {
    if (!entry.imageUrls.length) {
      continue;
    }
    const candidates = [entry.roomName, entry.roomName.replace(/\s+room$/i, "")]
      .map((value) => value.trim())
      .filter(Boolean);
    for (const candidate of candidates) {
      const score = scoreRoomNameMatch(baseTitle, candidate);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
  }

  return bestScore >= threshold ? best : null;
}

export function findCaptionPhotoMatches(
  rateTitle: string,
  captionIndex: readonly LiteApiCaptionPhotoEntry[],
  threshold = LITEAPI_CAPTION_MATCH_THRESHOLD,
  max = 3,
): string[] {
  const baseTitle = extractRateTitleBase(rateTitle);
  if (!baseTitle || captionIndex.length === 0) {
    return [];
  }

  const scored = captionIndex
    .filter((entry) => !GENERIC_CAPTION_PATTERN.test(entry.caption))
    .map((entry) => ({
      entry,
      score: scoreRoomNameMatch(baseTitle, entry.caption),
    }))
    .filter((row) => row.score >= threshold)
    .sort((a, b) => b.score - a.score);

  const urls: string[] = [];
  for (const row of scored) {
    const url = row.entry.url.trim();
    if (!url || urls.includes(url)) {
      continue;
    }
    urls.push(url);
    if (urls.length >= max) {
      break;
    }
  }
  return urls;
}
