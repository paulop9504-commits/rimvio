import {
  extractPlaceEntities,
  resolveNavigationPlaceName,
} from "@/lib/context-resolver/place-entity-text";

const DONG_TOKEN = /([가-힣A-Za-z0-9]{2,12}동)/u;
const STATION_TOKEN = /([가-힣A-Za-z0-9]{2,12}역)/u;

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

/** Media-guide map chip — short explicit place label without globe domain imports. */
export function shortenExplicitPlacePhrase(text: string): string | null {
  const cleaned = normalizeText(text);
  if (!cleaned) {
    return null;
  }

  const entities = extractPlaceEntities(cleaned);
  const dong = cleaned.match(DONG_TOKEN)?.[1] ?? null;
  const station = cleaned.match(STATION_TOKEN)?.[1] ?? null;
  const entityName = [entities.name, entities.branch].filter(Boolean).join(" ").trim() || null;

  if (dong) {
    return dong;
  }
  if (station) {
    return station;
  }
  if (entityName) {
    return entityName;
  }

  const nav = resolveNavigationPlaceName(cleaned);
  if (nav?.trim() && nav.trim() !== cleaned) {
    return nav.trim();
  }

  return null;
}
