import { scorePlaceNameMatch } from "@/lib/globe/place-review-video";

const LODGING_TOUR_RE =
  /룸\s*투어|room\s*tour|hotel\s*tour|ホテル.*ルーム|ルームツアー|room\s*review|숙소\s*투어|객실\s*투어/iu;

const NEGATIVE_LIST_RE =
  /top\s*10|top10|best\s*\d|ランキング|おすすめ.*選|비교|vs\.?|versus|#\d+\s*選|맛집\s*top|호텔\s*추천\s*\d/iu;

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function tokenizeAddressLocality(address: string | null | undefined): string[] {
  const raw = normalizeText(address);
  if (!raw) {
    return [];
  }
  return raw
    .split(/[\s,、·/|-]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function hasLodgingTourKeyword(text: string): boolean {
  return LODGING_TOUR_RE.test(text);
}

function hasNegativeListPattern(text: string): boolean {
  return NEGATIVE_LIST_RE.test(text);
}

/** 0–1 confidence that a YouTube row matches this lodging property. */
export function computeLodgingYouTubeConfidence(input: {
  placeName: string;
  address?: string | null;
  title?: string | null;
  description?: string | null;
  channelTitle?: string | null;
}): number {
  const placeName = normalizeText(input.placeName);
  if (!placeName) {
    return 0;
  }

  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const channelTitle = normalizeText(input.channelTitle);
  const blob = `${title} ${description} ${channelTitle}`;
  const blobLower = blob.toLowerCase();
  const placeLower = placeName.toLowerCase();

  if (placeLower.length >= 4 && blobLower.includes(placeLower)) {
    let confidence = 0.96;
    if (hasLodgingTourKeyword(blob)) {
      confidence += 0.02;
    }
    if (hasNegativeListPattern(blob)) {
      confidence -= 0.35;
    }
    return Math.max(0, Math.min(1, confidence));
  }

  const nameScore = scorePlaceNameMatch({
    placeName,
    title,
    channelTitle,
  });
  const descriptionScore = scorePlaceNameMatch({
    placeName,
    title: description,
    channelTitle: null,
  });
  const combinedNameScore = Math.max(nameScore, descriptionScore);

  let confidence = 0;
  if (combinedNameScore >= 120) {
    confidence = 0.95;
  } else if (combinedNameScore >= 48) {
    confidence = 0.88;
  } else if (combinedNameScore >= 30) {
    confidence = 0.82;
  } else if (combinedNameScore >= 18) {
    confidence = 0.74;
  } else {
    confidence = (combinedNameScore / 120) * 0.65;
  }

  if (hasLodgingTourKeyword(blob)) {
    confidence += 0.06;
  }

  for (const token of tokenizeAddressLocality(input.address)) {
    if (token.length >= 2 && blobLower.includes(token.toLowerCase())) {
      confidence += 0.03;
      break;
    }
  }

  if (hasNegativeListPattern(blob)) {
    confidence -= 0.4;
  }

  return Math.max(0, Math.min(1, confidence));
}
