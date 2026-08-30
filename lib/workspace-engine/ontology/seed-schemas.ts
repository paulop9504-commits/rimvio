/**
 * Seed ontologies — human-verified domain models (not AI-invented at runtime).
 */

import type { DomainOntologySchema } from "@/lib/workspace-engine/ontology/domain-ontology-schema";

export const TRAVEL_ONTOLOGY_V1: DomainOntologySchema = {
  schemaId: "ontology.travel.v1",
  domain: "travel",
  version: "1.0.0",
  titleKo: "Travel Domain Ontology",
  descriptionKo: "Trip · Destination · Hotel · Restaurant · Activity · Booking",
  verificationStatus: "VERIFIED",
  objectTypes: [
    {
      typeId: "Trip",
      titleKo: "여행",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "startDate", type: "date", required: false },
        { name: "endDate", type: "date", required: false },
      ],
    },
    {
      typeId: "Destination",
      titleKo: "목적지",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "country", type: "string", required: false },
      ],
    },
    {
      typeId: "Hotel",
      titleKo: "호텔",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "location", type: "GeoPoint", required: true },
      ],
    },
    {
      typeId: "Restaurant",
      titleKo: "맛집",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "location", type: "GeoPoint", required: true },
      ],
    },
    {
      typeId: "Activity",
      titleKo: "액티비티",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "location", type: "GeoPoint", required: false },
      ],
    },
    {
      typeId: "Booking",
      titleKo: "예약",
      fields: [
        { name: "status", type: "string", required: true },
        { name: "totalPriceKrw", type: "number", required: false },
      ],
    },
  ],
  relations: [
    { kind: "PART_OF", fromType: "Destination", toType: "Trip", descriptionKo: "목적지 ⊂ 여행" },
    { kind: "PART_OF", fromType: "Hotel", toType: "Trip", descriptionKo: "호텔 ⊂ 여행" },
    { kind: "LOCATED_IN", fromType: "Hotel", toType: "Destination", descriptionKo: "호텔 위치" },
    { kind: "LOCATED_IN", fromType: "Restaurant", toType: "Destination", descriptionKo: "맛집 위치" },
    { kind: "LOCATED_IN", fromType: "Activity", toType: "Destination", descriptionKo: "액티비티 위치" },
    { kind: "BOOKED_BY", fromType: "Booking", toType: "Hotel", descriptionKo: "호텔 예약" },
  ],
};

export const PROPERTY_ONTOLOGY_V1: DomainOntologySchema = {
  schemaId: "ontology.property.v1",
  domain: "property",
  version: "1.0.0",
  titleKo: "Property Domain Ontology",
  descriptionKo: "부동산 플랫폼 — Property · Building · Unit · Lease",
  verificationStatus: "UNVERIFIED",
  objectTypes: [
    {
      typeId: "Property",
      titleKo: "매물",
      fields: [
        { name: "location", type: "GeoPoint", required: true },
        { name: "price", type: "Money", required: true },
        { name: "area", type: "number", required: true },
        { name: "rooms", type: "number", required: false },
      ],
    },
    { typeId: "Building", titleKo: "건물", fields: [{ name: "name", type: "string", required: true }] },
    { typeId: "Unit", titleKo: "세대", fields: [{ name: "floor", type: "number", required: false }] },
    { typeId: "Lease", titleKo: "임대", fields: [{ name: "termMonths", type: "number", required: true }] },
    { typeId: "District", titleKo: "구역", fields: [{ name: "name", type: "string", required: true }] },
    { typeId: "Agent", titleKo: "중개", fields: [{ name: "name", type: "string", required: true }] },
    { typeId: "POI", titleKo: "주변 POI", fields: [{ name: "name", type: "string", required: true }] },
  ],
  relations: [
    { kind: "LOCATED_IN", fromType: "Property", toType: "District", descriptionKo: "매물 구역" },
    { kind: "LISTED_BY", fromType: "Property", toType: "Agent", descriptionKo: "중개 등록" },
    { kind: "HAS_IMAGE", fromType: "Property", toType: "POI", descriptionKo: "이미지" },
    { kind: "HAS_PRICE", fromType: "Property", toType: "Property", descriptionKo: "가격 facet" },
    { kind: "NEAR", fromType: "Property", toType: "POI", descriptionKo: "주변 시설" },
  ],
};

export const SEED_ONTOLOGY_SCHEMAS: readonly DomainOntologySchema[] = [
  TRAVEL_ONTOLOGY_V1,
  PROPERTY_ONTOLOGY_V1,
];
