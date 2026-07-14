/**
 * Attraction / amenity photo gallery — scenery · landmark · vibe (not food menus).
 */

import {
  fetchGoogleCseWebThumbnail,
  isGoogleCseConfigured,
} from "@/lib/vision/google-cse-web-thumbnail";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { naverSearch } from "@/lib/naver/search-api";
import type { NaverSearchItem } from "@/lib/naver/types";
import type { PlaceCandidate } from "@/lib/context-resolver/places/types";
import { fetchFoodPhotoUrls } from "@/lib/places/fetch-place-thumbnails";

const MAX_ATTRACTION_PHOTOS = 8;

function imageUrlFromNaverItem(item: NaverSearchItem): string | null {
  const link = item.link?.trim();
  const thumbnail = item.thumbnail?.trim();
  return link || thumbnail || null;
}

function isUsableAttractionPhoto(url: string): boolean {
  if (!url.trim()) {
    return false;
  }
  if (/\.(gif|svg)(\?|$)/i.test(url)) {
    return false;
  }
  return true;
}

async function fetchNaverImageUrls(query: string, display: number): Promise<string[]> {
  if (!isNaverSearchConfigured()) {
    return [];
  }
  try {
    const result = await naverSearch("image", query, { display, sort: "sim" });
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const item of result.items) {
      const url = imageUrlFromNaverItem(item);
      if (!url || seen.has(url) || !isUsableAttractionPhoto(url)) {
        continue;
      }
      seen.add(url);
      urls.push(url);
    }
    return urls;
  } catch {
    return [];
  }
}

function buildAttractionPhotoQueries(input: {
  name: string;
  anchor: string | null;
}): string[] {
  const { name, anchor } = input;
  const latinHeavy = /[A-Za-z]{3,}/.test(name) || (anchor ? /[A-Za-z]{3,}/.test(anchor) : false);
  return [
    ...new Set(
      [
        `${name} 관광`,
        `${name} 명소`,
        `${name} 야경`,
        `${name} 풍경`,
        `${name} 여행`,
        latinHeavy ? `${name} park` : null,
        latinHeavy ? `${name} travel` : null,
        latinHeavy ? `${name} visit` : null,
        latinHeavy && anchor ? `${name} ${anchor}` : null,
        latinHeavy && anchor ? `${anchor} ${name} park` : null,
        anchor ? `${anchor} ${name}` : null,
        anchor ? `${name} ${anchor} 관광` : null,
        `${name}`,
      ].filter((query): query is string => Boolean(query?.trim())),
    ),
  ];
}

/** Naver Image (+ CSE) — landmark / scenery shots for activity · amenity. */
export async function fetchAttractionPhotoUrls(input: {
  name: string;
  anchor: string | null;
}): Promise<string[]> {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const query of buildAttractionPhotoQueries(input)) {
    if (urls.length >= MAX_ATTRACTION_PHOTOS) {
      break;
    }
    const batch = await fetchNaverImageUrls(query, MAX_ATTRACTION_PHOTOS);
    for (const url of batch) {
      if (seen.has(url)) {
        continue;
      }
      seen.add(url);
      urls.push(url);
      if (urls.length >= MAX_ATTRACTION_PHOTOS) {
        break;
      }
    }
  }

  if (urls.length === 0 && isGoogleCseConfigured()) {
    const fallbackQuery = input.anchor
      ? `${input.name} ${input.anchor} travel landmark`
      : `${input.name} tourist attraction`;
    const fromGoogle = await fetchGoogleCseWebThumbnail(fallbackQuery);
    if (fromGoogle) {
      urls.push(fromGoogle);
    }
  }

  return urls;
}

export type PlaceThumbnailDomain = "eatery" | "activity" | "amenity";

/** Attach hero + gallery — food for eatery, scenery for activity/amenity. */
export async function attachPlaceThumbnailsForDomain(
  candidates: PlaceCandidate[],
  input: {
    anchor: string | null;
    cuisine?: string | null;
    domain: PlaceThumbnailDomain;
  },
): Promise<PlaceCandidate[]> {
  return Promise.all(
    candidates.map(async (place) => {
      if (place.photo_urls?.length && place.thumbnail_url) {
        return place;
      }

      const photo_urls =
        input.domain === "eatery"
          ? await fetchFoodPhotoUrls({
              name: place.name,
              anchor: input.anchor,
              cuisine: input.cuisine,
            })
          : await fetchAttractionPhotoUrls({
              name: place.name,
              anchor: input.anchor,
            });

      return {
        ...place,
        thumbnail_url: place.thumbnail_url ?? photo_urls[0] ?? null,
        photo_urls:
          place.photo_urls && place.photo_urls.length > 0
            ? place.photo_urls
            : photo_urls,
      };
    }),
  );
}
