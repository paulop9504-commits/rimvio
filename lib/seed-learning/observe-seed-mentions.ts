import type { ResolvedEntity } from "@/lib/entity-resolver/types";
import {
  pathImpliesAmenity,
  pathImpliesLandmark,
  pathImpliesLodging,
  pathImpliesRetail,
} from "@/lib/entity-resolver/semantic-layer";
import { applySeedMentionEvents } from "@/lib/seed-learning/seed-learning-store";
import {
  isSeedLearningTokenWorthy,
  normalizeSeedLearningToken,
} from "@/lib/seed-learning/normalize-seed-token";
import type {
  SeedLearningSectorId,
  SeedMentionEvent,
} from "@/lib/seed-learning/types";

function sectorForEntity(entity: ResolvedEntity): SeedLearningSectorId | null {
  if (entity.kind === "Station") {
    return "stations";
  }
  if (entity.kind === "Airport") {
    return "airports";
  }
  if (entity.kind === "Hotel" || pathImpliesLodging(entity.semanticPath)) {
    return "lodging_brands";
  }
  if (entity.kind === "Brand" || entity.id.startsWith("brand:")) {
    return "food_brands";
  }
  if (
    entity.kind === "Food" ||
    entity.kind === "Dessert" ||
    entity.id.startsWith("cuisine:")
  ) {
    return "cuisine";
  }
  if (pathImpliesRetail(entity.semanticPath)) {
    return "retail_brands";
  }
  if (pathImpliesAmenity(entity.semanticPath)) {
    return "amenities";
  }
  if (
    entity.kind === "Location" ||
    entity.kind === "Museum" ||
    pathImpliesLandmark(entity.semanticPath)
  ) {
    return "landmarks";
  }
  if (entity.geoId) {
    return "world_geo";
  }
  return null;
}

function domainForEntity(entity: ResolvedEntity): string {
  if (entity.kind === "Station" || entity.kind === "Airport") {
    return "transit";
  }
  if (pathImpliesLodging(entity.semanticPath) || entity.kind === "Hotel") {
    return "lodging";
  }
  if (entity.kind === "Brand" || entity.kind === "Food" || entity.kind === "Dessert") {
    return "eatery";
  }
  if (pathImpliesAmenity(entity.semanticPath)) {
    return "amenity";
  }
  if (pathImpliesLandmark(entity.semanticPath)) {
    return "activity";
  }
  return "general";
}

/** Hit events from resolved dictionary / reality-graph entities. */
export function seedMentionEventsFromEntities(
  entities: readonly ResolvedEntity[],
  messageSnippet?: string | null,
): SeedMentionEvent[] {
  const out: SeedMentionEvent[] = [];
  for (const entity of entities) {
    const sectorId = sectorForEntity(entity);
    if (!sectorId) {
      continue;
    }
    const token = entity.queryFocus?.trim() || entity.label.trim();
    if (!isSeedLearningTokenWorthy(token)) {
      continue;
    }
    out.push({
      sectorId,
      token,
      outcome: "hit",
      domain: domainForEntity(entity),
      geoId: entity.geoId ?? null,
      entityId: entity.id,
      messageSnippet: messageSnippet ?? null,
    });
  }
  return out;
}

/**
 * Heuristic miss probes — spans that look like seedable places but did not hit.
 * Deterministic only; never invents coords.
 */
export function seedMentionMissProbesFromUtterance(
  message: string,
  entities: readonly ResolvedEntity[],
): SeedMentionEvent[] {
  const text = message.trim();
  if (!text) {
    return [];
  }
  const covered = new Set(
    entities.flatMap((row) => {
      const labels = [row.label, row.queryFocus ?? "", ...(row.aliases ?? [])]
        .map((v) => normalizeSeedLearningToken(v))
        .filter(Boolean);
      return labels;
    }),
  );

  const probes: Array<{ sectorId: SeedLearningSectorId; token: string; domain: string }> =
    [];

  for (const match of text.matchAll(
    /([가-힣A-Za-z0-9]{2,16}(?:역|駅)|[A-Za-z]{2,16}\s*station)/giu,
  )) {
    const token = match[1]?.trim();
    if (token) {
      probes.push({ sectorId: "stations", token, domain: "transit" });
    }
  }

  for (const match of text.matchAll(
    /([가-힣A-Za-z]{2,20}(?:공항|空港)|(?:narita|haneda|kansai|incheon|gimpo|naha)\s*(?:airport)?)/giu,
  )) {
    const token = match[1]?.trim();
    if (token) {
      probes.push({ sectorId: "airports", token, domain: "transit" });
    }
  }

  for (const match of text.matchAll(
    /(디즈니(?:랜드|씨)?|유니버설|usj|스카이트리|센소지|경복궁|남산타워|롯데월드|후시미\s*이나리|teamlab|팀\s*랩)/giu,
  )) {
    const token = match[1]?.trim();
    if (token) {
      probes.push({ sectorId: "landmarks", token, domain: "activity" });
    }
  }

  for (const match of text.matchAll(
    /(캡슐(?:\s*호텔)?|료칸|게스트\s*하우스|호스텔|도미토리|민박|한옥|글램핑)/giu,
  )) {
    const token = match[1]?.trim();
    if (token) {
      probes.push({
        sectorId: "lodging_stay_types",
        token,
        domain: "lodging",
      });
    }
  }

  for (const match of text.matchAll(
    /(apa|아파|도요코인|토요코인|daiwa|다이와|route\s*inn|루트인)/giu,
  )) {
    const token = match[1]?.trim();
    if (token) {
      probes.push({
        sectorId: "lodging_brands",
        token,
        domain: "lodging",
      });
    }
  }

  for (const match of text.matchAll(
    /(라멘|스시|초밥|우동|야키니쿠|오코노미야키|타코야키|말차|디저트|라면)/giu,
  )) {
    const token = match[1]?.trim();
    if (token) {
      probes.push({ sectorId: "cuisine", token, domain: "eatery" });
    }
  }

  const out: SeedMentionEvent[] = [];
  const seen = new Set<string>();
  for (const probe of probes) {
    const token = normalizeSeedLearningToken(probe.token);
    if (!isSeedLearningTokenWorthy(token)) {
      continue;
    }
    if (covered.has(token)) {
      continue;
    }
    // Substring cover — 「난바역」 hit covers probe 「난바역」
    const coveredByHit = [...covered].some(
      (hit) => hit.includes(token) || token.includes(hit),
    );
    if (coveredByHit) {
      continue;
    }
    const key = `${probe.sectorId}::${token}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({
      sectorId: probe.sectorId,
      token,
      outcome: "miss",
      domain: probe.domain,
      messageSnippet: text.slice(0, 80),
    });
  }
  return out;
}

export function observeSeedMentions(
  events: readonly SeedMentionEvent[],
): number {
  if (events.length === 0) {
    return 0;
  }
  applySeedMentionEvents(events);
  return events.length;
}
