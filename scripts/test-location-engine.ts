#!/usr/bin/env npx tsx
/**
 * Location Engine — Reality Graph first; Nominatim normalize via fixture (offline).
 */
import assert from "node:assert/strict";
import {
  normalizeNominatimHit,
  normalizeRealityGraphText,
  resolveLocationFromText,
} from "../lib/location-engine";
import type { NominatimHit } from "../lib/location-engine/providers/nominatim";
import {
  resolveWorldGeoEntity,
  projectWorldGeoToPlaceFields,
} from "../lib/reality-graph";

async function main(): Promise<void> {
  // Graph: 도쿄 신주쿠 → Entity hierarchy
  {
    const entity = normalizeRealityGraphText("도쿄 신주쿠");
    assert.ok(entity);
    assert.equal(entity!.id, "geo:jp:tokyo:shinjuku");
    assert.match(entity!.hierarchyKo, /일본/);
    assert.match(entity!.hierarchyKo, /도쿄/);
    assert.match(entity!.hierarchyKo, /신주쿠/);
    assert.equal(entity!.admin.countryCode, "JP");
  }

  // Shanghai district
  {
    const hit = resolveWorldGeoEntity("홍차오");
    assert.ok(hit);
    assert.equal(hit!.node.id, "geo:cn:shanghai:hongqiao");
    const fields = projectWorldGeoToPlaceFields("상하이 푸동");
    assert.ok(fields);
    assert.equal(fields!.zoneId, "geo:cn:shanghai:pudong");
    assert.equal(fields!.countryCode, "CN");
  }

  // Nominatim hit snaps to graph when label matches Shinjuku
  {
    const fake: NominatimHit = {
      lat: 35.6938,
      lng: 139.7034,
      displayName: "Shinjuku, Tokyo, Japan",
      placeId: "999",
      osmType: "relation",
      osmId: "1",
      admin: {
        countryCode: "JP",
        countryName: "Japan",
        region: "Tokyo",
        city: "Tokyo",
        district: "Shinjuku",
        neighborhood: null,
      },
      labelKo: "신주쿠",
      labelEn: "Shinjuku",
    };
    const entity = normalizeNominatimHit(fake);
    assert.equal(entity.id, "geo:jp:tokyo:shinjuku");
    assert.equal(entity.provider, "nominatim");
  }

  // Resolve text prefers graph (no network when catalog hits)
  {
    const result = await resolveLocationFromText("신주쿠");
    assert.ok(result);
    assert.equal(result!.entity.id, "geo:jp:tokyo:shinjuku");
    assert.deepEqual(result!.providersTried, ["reality_graph"]);
  }

  console.log("✓ location-engine");
}

void main();
