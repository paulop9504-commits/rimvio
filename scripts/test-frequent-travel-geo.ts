#!/usr/bin/env npx tsx
/**
 * Frequent JP/KR stations · landmarks — world geo + Station dictionary.
 */
import assert from "node:assert/strict";
import {
  findStationEntity,
  resolveEntities,
  STATION_CATALOG,
} from "../lib/entity-resolver";
import { resolveDiscoveryOriginFromUtterance } from "../lib/globe/context-condition-ai/resolve-discovery-origin-from-utterance";
import { listFrequentTravelGeoNodes } from "../lib/reality-graph/frequent-travel-geo";
import { resolveWorldGeoEntity } from "../lib/reality-graph/resolve-world-geo";
import { listWorldGeoSeed } from "../lib/reality-graph/world-geo-seed";

assert.ok(listFrequentTravelGeoNodes().length >= 40);
assert.ok(STATION_CATALOG.length >= 25);
assert.ok(
  listWorldGeoSeed().some((n) => n.id === "geo:kr:seoul:gangnam-station"),
);

const cases: Array<{ q: string; geoId: string; station?: boolean }> = [
  { q: "신주쿠역 근처 호텔", geoId: "geo:jp:tokyo:shinjuku-station", station: true },
  { q: "시부야역 맛집", geoId: "geo:jp:tokyo:shibuya-station", station: true },
  { q: "교토역 캡슐호텔", geoId: "geo:jp:kyoto:kyoto-station", station: true },
  { q: "하카타역 숙소", geoId: "geo:jp:fukuoka:hakata-station", station: true },
  { q: "강남역 근처", geoId: "geo:kr:seoul:gangnam-station", station: true },
  { q: "홍대 카페", geoId: "geo:kr:seoul:hongdae", station: true },
  { q: "해운대 호텔", geoId: "geo:kr:busan:haeundae", station: true },
  { q: "후시미 이나리", geoId: "geo:jp:kyoto:fushimi-inari" },
  { q: "경복궁", geoId: "geo:kr:seoul:gyeongbokgung" },
];

for (const row of cases) {
  const hit = resolveWorldGeoEntity(row.q);
  assert.ok(hit, `geo miss: ${row.q}`);
  assert.equal(hit!.node.id, row.geoId, `geo id for ${row.q}`);

  if (row.station) {
    const station = findStationEntity(resolveEntities(row.q).entities);
    assert.ok(station, `station miss: ${row.q}`);
    assert.equal(station!.geoId, row.geoId);

    const origin = resolveDiscoveryOriginFromUtterance(row.q);
    assert.ok(origin);
    assert.ok(Math.abs(origin!.lat - hit!.node.centroid.lat) < 0.02);
  }
}

// Ward still wins bare 신주쿠 (not station)
{
  const hit = resolveWorldGeoEntity("신주쿠");
  assert.equal(hit?.node.id, "geo:jp:tokyo:shinjuku");
}

console.log(
  `test-frequent-travel-geo: ok (${STATION_CATALOG.length} stations, ${listFrequentTravelGeoNodes().length} frequent nodes)`,
);
