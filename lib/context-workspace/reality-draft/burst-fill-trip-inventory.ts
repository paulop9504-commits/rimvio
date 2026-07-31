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

function pickHit(
  hits: readonly PlaceSearchHit[],
  usedIds: ReadonlySet<string>,
): PlaceSearchHit | null {
  for (const hit of hits) {
    if (!usedIds.has(hit.id)) return hit;
  }
  return null;
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
  const searched = input.search({
    query,
    domain,
    anchorLat: input.cluster.lat,
    anchorLng: input.cluster.lng,
    limit: input.limit,
  });
  // Extra orbit seeds so catalog exhaustion still leaves unique picks per slot.
  const orbit = runPlaceSearch({
    query: `${query} ${input.slot.dayPart}`,
    domain,
    anchorLat: input.cluster.lat,
    anchorLng: input.cluster.lng,
    limit: input.limit,
    skipOsakaCatalog: true,
    allowSeedFallback: true,
    contextLabelKo: input.destinationKo,
  });
  const preferred = clusterPreferredHits(
    input.slot,
    input.cluster,
    domain,
    input.destinationKo,
  );
  let hits = mergeHits(
    preferred,
    [...searched, ...orbit],
    input.slot.slotId,
  ).slice(0, Math.max(input.limit, 8));
  let picked = pickHit(hits, input.usedIds);
  if (!picked) {
    const synthetic: PlaceSearchHit = {
      id: `burst:${input.slot.slotId}`,
      labelKo: input.slot.labelKo,
      domain,
      lat: input.cluster.lat,
      lng: input.cluster.lng,
      rating: 4.2,
      walkMinutes: 10,
      reservable: domain !== "poi",
      localFavorite: false,
      priceBand: 2,
      source: "seed",
      amountLabel: null,
    };
    hits = [...hits, synthetic];
    picked = synthetic;
  }
  input.usedIds.add(picked.id);
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
            allowSeedFallback: true,
          }),
      }),
    );
  }
  return out;
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
        preferred: [] as PlaceSearchHit[],
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
      allowSeedFallback: true,
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
      preferred,
    };
  });

  const batches = await Promise.all(jobs);
  const usedIds = new Set<string>();
  return batches.map((batch, index) => {
    const slot = input.slots[index]!;
    const cluster = clusterForDay(clusters, slot.day);
    const domain = searchDomainForSlot(slot);
    let hits = batch.hits;
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
        reservable: domain !== "poi",
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
