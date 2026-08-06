/**
 * L2 — Parallel slot inventory burst for trip Reality Draft.
 * Uses Search Engine (instant lodging/eatery/poi) — not chat essay generation.
 */

import type {
  TripEntitySlot,
  TripSlotInventory,
} from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
import {
  clusterForDay,
  planTripDayClusters,
  type TripDayCluster,
} from "@/lib/context-workspace/reality-draft/trip-day-clusters";
import { guideWebSeedHits } from "@/lib/context-workspace/reality-draft/guide-web-seed-hits";
import type { GraphEntityDomain } from "@/lib/graph-command/types";
import { OSAKA_APA_NAMBA } from "@/lib/search-engine/osaka-demo-catalog";
import { OSAKA_TRIP_DRAFT_STOPS } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
import {
  runPlaceSearch,
  type PlaceSearchHit,
} from "@/lib/search-engine/run-place-search";
import { runPlaceSearchAsync } from "@/lib/search-engine/run-place-search-async";
import { rankByValueConsensus } from "@/lib/search-engine/score-value-consensus";

function searchDomainForSlot(
  slot: TripEntitySlot,
): GraphEntityDomain | null {
  if (slot.entityKind === "lodging" || slot.dayPart === "stay") {
    return "lodging";
  }
  if (slot.entityKind === "eatery") return "eatery";
  if (slot.entityKind === "itinerary" || slot.entityKind === "poi") {
    return "poi";
  }
  return null;
}

function queryForSlot(
  slot: TripEntitySlot,
  cluster: TripDayCluster,
): string {
  const domain = searchDomainForSlot(slot);
  if (domain === "lodging") return cluster.lodgingQuery;
  if (domain === "eatery") return cluster.eateryQuery;
  if (domain === "poi") return cluster.poiQuery;
  return cluster.poiQuery;
}

/** Prefer cluster landmarks + guide-web seeds before generic orbit. */
function clusterPreferredHits(
  slot: TripEntitySlot,
  cluster: TripDayCluster,
  domain: GraphEntityDomain,
  destinationKo: string,
): PlaceSearchHit[] {
  const preferred: PlaceSearchHit[] = [];

  if (domain === "lodging" && cluster.id === "namba") {
    preferred.push({
      id: OSAKA_APA_NAMBA.id,
      labelKo: "APA 난바",
      domain: "lodging",
      lat: OSAKA_APA_NAMBA.lat,
      lng: OSAKA_APA_NAMBA.lng,
      rating: 4.3,
      walkMinutes: 0,
      reservable: true,
      localFavorite: false,
      priceBand: 2,
      source: "seed",
      amountLabel: "₩12만/박",
    });
  }
  if (domain === "poi" && cluster.id === "usj") {
    const usj = OSAKA_TRIP_DRAFT_STOPS.find((s) =>
      /usj|theme_park/iu.test(s.tags.join(" ")),
    );
    if (usj) {
      preferred.push({
        id: usj.id,
        labelKo: usj.title,
        domain: "poi",
        lat: usj.lat,
        lng: usj.lng,
        rating: usj.rating,
        walkMinutes: usj.walkMinutes,
        reservable: false,
        localFavorite: false,
        priceBand: 2,
        source: "seed",
        amountLabel: usj.amountLabel,
      });
    }
  }
  if (domain === "poi" && cluster.id === "dotonbori") {
    const spot = OSAKA_TRIP_DRAFT_STOPS.find((s) =>
      /dotonbori|도톤/iu.test(`${s.id} ${s.title}`),
    );
    if (spot) {
      preferred.push({
        id: spot.id,
        labelKo: spot.title,
        domain: "poi",
        lat: spot.lat,
        lng: spot.lng,
        rating: spot.rating,
        walkMinutes: spot.walkMinutes,
        reservable: false,
        localFavorite: true,
        priceBand: 1,
        source: "seed",
        amountLabel: spot.amountLabel,
      });
    }
  }
  if (domain === "eatery" && /namba|dotonbori/iu.test(cluster.id)) {
    const food = OSAKA_TRIP_DRAFT_STOPS.find((s) => s.kind === "eatery");
    if (food) {
      preferred.push({
        id: food.id,
        labelKo: food.title,
        domain: "eatery",
        lat: food.lat,
        lng: food.lng,
        rating: food.rating,
        walkMinutes: food.walkMinutes,
        reservable: true,
        localFavorite: true,
        priceBand: 2,
        source: "seed",
        amountLabel: food.amountLabel,
      });
    }
  }

  preferred.push(
    ...guideWebSeedHits({
      destinationKo,
      clusterId: cluster.id,
      dayPart: slot.dayPart,
      domain,
    }),
  );
  return preferred;
}

function uniquifyHitForSlot(
  hit: PlaceSearchHit,
  slotId: string,
): PlaceSearchHit {
  // Deterministic orbit seeds reuse `search:domain:index:label` across anchors.
  if (hit.source === "seed" && hit.id.startsWith("search:")) {
    return { ...hit, id: `${hit.id}::${slotId}` };
  }
  return hit;
}

function mergeHits(
  preferred: readonly PlaceSearchHit[],
  searched: readonly PlaceSearchHit[],
  slotId: string,
): PlaceSearchHit[] {
  const seen = new Set<string>();
  const out: PlaceSearchHit[] = [];
  for (const raw of [...preferred, ...searched]) {
    const hit = uniquifyHitForSlot(raw, slotId);
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    out.push(hit);
  }
  return rankByValueConsensus(out);
}

function isGenericOrbitLabel(labelKo: string): boolean {
  return /근처 카페|골목 맛집|로컬 식당|리버뷰 호텔|스테이 인|시티 로지|포토스팟|산책로|전망대/iu.test(
    labelKo.trim(),
  );
}

function hitEntityScore(hit: PlaceSearchHit): number {
  if (
    hit.source === "liteapi" ||
    hit.source === "maps" ||
    hit.source === "booking"
  ) {
    return 40 + (hit.thumbnailUrl ? 5 : 0) + (hit.amountLabel ? 3 : 0);
  }
  if (hit.source === "review") return 30;
  if (hit.id.startsWith("burst:") || isGenericOrbitLabel(hit.labelKo)) {
    return 0;
  }
  return 10;
}

function pickHit(
  hits: readonly PlaceSearchHit[],
  usedIds: ReadonlySet<string>,
): PlaceSearchHit | null {
  const ranked = [...hits].sort(
    (a, b) => hitEntityScore(b) - hitEntityScore(a),
  );
  for (const hit of ranked) {
    if (usedIds.has(hit.id)) continue;
    // Never materialize 「근처 카페 / 포토스팟 / 리버뷰 호텔」 as Place Entity.
    if (hitEntityScore(hit) <= 0) continue;
    return hit;
  }
  return null;
}

function isGenericOrbitHit(hit: PlaceSearchHit): boolean {
  return (
    hitEntityScore(hit) <= 0 ||
    isGenericOrbitLabel(hit.labelKo) ||
    (hit.source === "seed" && hit.id.startsWith("search:"))
  );
}

function fillOneSlot(input: {
  readonly slot: TripEntitySlot;
  readonly cluster: TripDayCluster;
  readonly destinationKo: string;
  readonly limit: number;
  readonly usedIds: Set<string>;
  readonly search: (args: {
    query: string;
    domain: GraphEntityDomain;
    anchorLat: number;
    anchorLng: number;
    limit: number;
  }) => readonly PlaceSearchHit[];
}): TripSlotInventory {
  const domain = searchDomainForSlot(input.slot);
  if (!domain) {
    return { slotId: input.slot.slotId, hits: [], picked: null };
  }
  const query = queryForSlot(input.slot, input.cluster);
  const searched = input
    .search({
      query,
      domain,
      anchorLat: input.cluster.lat,
      anchorLng: input.cluster.lng,
      limit: input.limit,
    })
    .filter((h) => !isGenericOrbitHit(h));
  const preferred = clusterPreferredHits(
    input.slot,
    input.cluster,
    domain,
    input.destinationKo,
  );
  // Trip Reality Draft: no orbit placeholder inventory (근처 카페 / 포토스팟).
  let hits = mergeHits(preferred, searched, input.slot.slotId).slice(
    0,
    Math.max(input.limit, 8),
  );
  const picked = pickHit(hits, input.usedIds);
  // Honest gap — do NOT invent 「근처 카페 / 포토스팟 / 리버뷰」 as a picked Entity.
  // materializeTripDraftStops will use Osaka catalog fallback or ready_slot skeleton.
  if (picked) {
    input.usedIds.add(picked.id);
  }
  return { slotId: input.slot.slotId, hits, picked };
}

/**
 * Sync burst — deterministic Search Engine (instant_* domains).
 * Call sites that must stay sync (prepareTripWorkspaceDraft) use this.
 */
export function burstFillTripInventory(input: {
  readonly destinationKo: string;
  readonly slots: readonly TripEntitySlot[];
  readonly dayCount: number;
  readonly limitPerSlot?: number;
}): readonly TripSlotInventory[] {
  const dest = input.destinationKo.trim() || "여행지";
  const limit = input.limitPerSlot ?? 6;
  const clusters = planTripDayClusters(dest, input.dayCount);
  const usedIds = new Set<string>();
  const out: TripSlotInventory[] = [];

  for (const slot of input.slots) {
    const cluster = clusterForDay(clusters, slot.day);
    out.push(
      fillOneSlot({
        slot,
        cluster,
        destinationKo: dest,
        limit,
        usedIds,
        search: (args) =>
          runPlaceSearch({
            query: args.query,
            domain: args.domain,
            anchorLat: args.anchorLat,
            anchorLng: args.anchorLng,
            limit: args.limit,
            contextLabelKo: dest,
            // Trip draft never invents Riverview/orbit placeholders.
            allowSeedFallback: false,
          }),
      }),
    );
  }
  return out;
}

type SlotSearchBatch = {
  readonly slotId: string;
  readonly hits: readonly PlaceSearchHit[];
};

async function finishAsyncSlotBatches(input: {
  readonly slots: readonly TripEntitySlot[];
  readonly destinationKo: string;
  readonly dayCount: number;
  readonly batches: readonly SlotSearchBatch[];
}): Promise<readonly TripSlotInventory[]> {
  const clusters = planTripDayClusters(input.destinationKo, input.dayCount);
  const usedIds = new Set<string>();
  return input.batches.map((batch, index) => {
    const slot = input.slots[index]!;
    const cluster = clusterForDay(clusters, slot.day);
    const domain = searchDomainForSlot(slot);
    let hits = batch.hits.filter((h) => !isGenericOrbitHit(h));
    let picked = pickHit(hits, usedIds);
    if (!picked && domain) {
      const synthetic: PlaceSearchHit = {
        id: `burst:${slot.slotId}`,
        labelKo: slot.labelKo,
        domain,
        lat: cluster.lat,
        lng: cluster.lng,
        rating: 4.2,
        walkMinutes: 10,
        reservable: domain === "lodging",
        localFavorite: false,
        priceBand: 2,
        source: "seed",
        amountLabel: null,
      };
      hits = [...hits, synthetic];
      picked = synthetic;
    }
    if (picked) usedIds.add(picked.id);
    return {
      slotId: batch.slotId,
      hits,
      picked,
    };
  });
}

/**
 * Async burst — Promise.all over runPlaceSearchAsync (Maps / LiteAPI when configured).
 */
export async function burstFillTripInventoryAsync(input: {
  readonly destinationKo: string;
  readonly slots: readonly TripEntitySlot[];
  readonly dayCount: number;
  readonly limitPerSlot?: number;
  readonly contextEventId?: string | null;
}): Promise<readonly TripSlotInventory[]> {
  const dest = input.destinationKo.trim() || "여행지";
  const limit = input.limitPerSlot ?? 6;
  const clusters = planTripDayClusters(dest, input.dayCount);

  const jobs = input.slots.map(async (slot) => {
    const domain = searchDomainForSlot(slot);
    const cluster = clusterForDay(clusters, slot.day);
    if (!domain) {
      return {
        slotId: slot.slotId,
        hits: [] as PlaceSearchHit[],
      };
    }
    const query = queryForSlot(slot, cluster);
    const searched = await runPlaceSearchAsync({
      query,
      domain,
      anchorLat: cluster.lat,
      anchorLng: cluster.lng,
      limit,
      contextLabelKo: dest,
      contextEventId: input.contextEventId ?? null,
      allowSeedFallback: false,
    });
    const preferred = clusterPreferredHits(
      slot,
      cluster,
      domain,
      dest,
    );
    return {
      slotId: slot.slotId,
      hits: mergeHits(preferred, searched, slot.slotId).slice(0, limit),
    };
  });

  const batches = await Promise.all(jobs);
  return finishAsyncSlotBatches({
    slots: input.slots,
    destinationKo: dest,
    dayCount: input.dayCount,
    batches,
  });
}

function toolIdForDomain(
  domain: GraphEntityDomain,
): "hotel.lookup" | "restaurant.lookup" | "maps.search" {
  if (domain === "lodging") return "hotel.lookup";
  if (domain === "eatery") return "restaurant.lookup";
  return "maps.search";
}

function candidatesToPlaceHits(
  domain: GraphEntityDomain,
  candidates: readonly {
    readonly id: string;
    readonly labelKo: string;
    readonly rating?: number | null;
    readonly walkMinutes?: number | null;
    readonly priceBand?: number | null;
    readonly reservable?: boolean | null;
    readonly localFavorite?: boolean | null;
    readonly lat?: number | null;
    readonly lng?: number | null;
    readonly source?: string | null;
    readonly liteapiOfferId?: string | null;
    readonly liteapiHotelId?: string | null;
    readonly amountLabel?: string | null;
    readonly reviewCount?: number | null;
    readonly priceKrw?: number | null;
    readonly thumbnailUrl?: string | null;
    readonly images?: readonly string[] | null;
  }[],
): PlaceSearchHit[] {
  const out: PlaceSearchHit[] = [];
  for (const c of candidates) {
    if (
      c.lat == null ||
      c.lng == null ||
      !Number.isFinite(c.lat) ||
      !Number.isFinite(c.lng)
    ) {
      continue;
    }
    const raw = c.source ?? "maps";
    const source: PlaceSearchHit["source"] =
      raw === "seed" ||
      raw === "maps" ||
      raw === "review" ||
      raw === "booking" ||
      raw === "liteapi"
        ? raw
        : "maps";
    out.push({
      id: c.id,
      labelKo: c.labelKo,
      domain,
      lat: c.lat,
      lng: c.lng,
      rating: c.rating ?? null,
      walkMinutes: c.walkMinutes ?? null,
      reservable: c.reservable ?? domain !== "poi",
      localFavorite: c.localFavorite ?? false,
      priceBand: c.priceBand ?? null,
      source,
      liteapiOfferId: c.liteapiOfferId ?? null,
      liteapiHotelId: c.liteapiHotelId ?? null,
      amountLabel: c.amountLabel ?? null,
      reviewCount: c.reviewCount ?? null,
      priceKrw: c.priceKrw ?? null,
      thumbnailUrl: c.thumbnailUrl ?? null,
      images: c.images ?? null,
    });
  }
  return out;
}

/**
 * Tool Registry burst — hotel.lookup / restaurant.lookup / maps.search per slot.
 * Prefer this for Placeholder → Place Entity materialization.
 */
export async function burstFillTripInventoryViaTools(input: {
  readonly destinationKo: string;
  readonly slots: readonly TripEntitySlot[];
  readonly dayCount: number;
  readonly limitPerSlot?: number;
  readonly contextEventId?: string | null;
}): Promise<readonly TripSlotInventory[]> {
  const { invokeRimvioToolAsync } = await import(
    "@/lib/tool-registry/invoke-rimvio-tool"
  );
  const dest = input.destinationKo.trim() || "여행지";
  const limit = input.limitPerSlot ?? 6;
  const clusters = planTripDayClusters(dest, input.dayCount);

  const jobs = input.slots.map(async (slot) => {
    const domain = searchDomainForSlot(slot);
    const cluster = clusterForDay(clusters, slot.day);
    if (!domain) {
      return { slotId: slot.slotId, hits: [] as PlaceSearchHit[] };
    }
    const query = queryForSlot(slot, cluster);
    const toolId = toolIdForDomain(domain);
    const result = await invokeRimvioToolAsync(toolId, {
      query,
      domain,
      lat: cluster.lat,
      lng: cluster.lng,
      contextEventId: input.contextEventId ?? undefined,
      contextLabelKo: dest,
      placeName: dest,
      utterance: `${dest} ${query}`,
    });
    const searched = candidatesToPlaceHits(
      domain,
      (result.candidates ?? []).slice(0, limit),
    );
    const preferred = clusterPreferredHits(slot, cluster, domain, dest);
    return {
      slotId: slot.slotId,
      hits: mergeHits(preferred, searched, slot.slotId).slice(0, limit),
    };
  });

  const batches = await Promise.all(jobs);
  return finishAsyncSlotBatches({
    slots: input.slots,
    destinationKo: dest,
    dayCount: input.dayCount,
    batches,
  });
}
