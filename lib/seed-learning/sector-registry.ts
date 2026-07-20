import type {
  SeedLearningSectorDef,
  SeedLearningSectorId,
} from "@/lib/seed-learning/types";
import { SEED_LEARNING_SECTOR_IDS } from "@/lib/seed-learning/types";

/**
 * Every Dictionary / geo seed surface that can learn from frequent mentions.
 * P0 = travel Globe scout anchors + lodging/eatery locks.
 */
export const SEED_LEARNING_SECTOR_REGISTRY: readonly SeedLearningSectorDef[] = [
  {
    id: "stations",
    labelKo: "역",
    priority: "P0",
    promotePaths: [
      "lib/reality-graph/frequent-travel-geo.ts",
      "lib/entity-resolver/catalogs/stations.ts",
    ],
    descriptionKo: "역·정류장 — discovery origin 좌표",
  },
  {
    id: "landmarks",
    labelKo: "명소",
    priority: "P0",
    promotePaths: [
      "lib/reality-graph/frequent-travel-geo.ts",
      "lib/entity-resolver/catalogs/landmarks.ts",
    ],
    descriptionKo: "테마파크·사원·타워 등 POI",
  },
  {
    id: "airports",
    labelKo: "공항",
    priority: "P0",
    promotePaths: [
      "lib/reality-graph/world-geo-seed.ts",
      "lib/entity-resolver/catalogs/airports.ts",
    ],
    descriptionKo: "공항 IATA·별칭",
  },
  {
    id: "world_geo",
    labelKo: "지역",
    priority: "P0",
    promotePaths: [
      "lib/reality-graph/world-geo-seed.ts",
      "lib/reality-graph/frequent-travel-geo.ts",
    ],
    descriptionKo: "도시·구·동네 admin / 구역",
  },
  {
    id: "lodging_brands",
    labelKo: "숙소 브랜드",
    priority: "P0",
    promotePaths: ["lib/entity-resolver/catalogs/lodging-brands.ts"],
    descriptionKo: "APA·도요코인 등 호텔 체인",
  },
  {
    id: "lodging_stay_types",
    labelKo: "숙소 유형",
    priority: "P1",
    promotePaths: ["lib/globe/lodging/lodging-stay-types.ts"],
    descriptionKo: "캡슐·료칸·게스트하우스 유형",
  },
  {
    id: "cuisine",
    labelKo: "요리",
    priority: "P0",
    promotePaths: [
      "lib/globe/context-condition-ai/parse-cuisine-candidates.ts",
    ],
    descriptionKo: "라멘·스시·말차 등 요리 카탈로그",
  },
  {
    id: "food_brands",
    labelKo: "음식 브랜드",
    priority: "P0",
    promotePaths: [
      "lib/globe/context-condition-ai/parse-food-brand-focus.ts",
    ],
    descriptionKo: "맥도날드·스타벅스 등",
  },
  {
    id: "cafe_chains",
    labelKo: "카페 체인",
    priority: "P1",
    promotePaths: ["lib/entity-resolver/catalogs/cafe-chains.ts"],
    descriptionKo: "카페 체인 사전",
  },
  {
    id: "amenities",
    labelKo: "편의시설",
    priority: "P1",
    promotePaths: [
      "lib/entity-resolver/catalogs/amenities.ts",
      "lib/context-resolver/discovery/extract-place-amenity-keyword.ts",
    ],
    descriptionKo: "편의점·약국·ATM",
  },
  {
    id: "retail_brands",
    labelKo: "리테일",
    priority: "P1",
    promotePaths: ["lib/entity-resolver/catalogs/retail-brands.ts"],
    descriptionKo: "유니클로·돈키 등 (Eatery로 승격 금지)",
  },
  {
    id: "transport_modes",
    labelKo: "교통",
    priority: "P1",
    promotePaths: ["lib/entity-resolver/catalogs/transport-modes.ts"],
    descriptionKo: "JR·신칸센·교통카드",
  },
  {
    id: "korea_known_places",
    labelKo: "한국 도시",
    priority: "P1",
    promotePaths: ["lib/globe/korea-known-places.ts"],
    descriptionKo: "한국 도시 geocode 폴백",
  },
  {
    id: "korea_known_neighborhoods",
    labelKo: "한국 동네",
    priority: "P1",
    promotePaths: ["lib/globe/korea-known-neighborhoods.ts"],
    descriptionKo: "동·구 시드",
  },
  {
    id: "korea_known_pois",
    labelKo: "한국 명소",
    priority: "P1",
    promotePaths: ["lib/globe/korea-known-pois.ts"],
    descriptionKo: "경복궁·코엑스 등",
  },
  {
    id: "korea_metro_districts",
    labelKo: "한국 자치구",
    priority: "P1",
    promotePaths: ["lib/globe/korea-metro-districts.ts"],
    descriptionKo: "모호한 구 단위 라벨",
  },
  {
    id: "departure_hub_airports",
    labelKo: "출발 허브",
    priority: "P1",
    promotePaths: [
      "lib/globe/departure-hub-airports.ts",
      "lib/globe/context-hub/korea-domestic-airports.ts",
    ],
    descriptionKo: "국내선·허브 공항 문구",
  },
  {
    id: "cuisine_search_keywords",
    labelKo: "요리 검색어",
    priority: "P1",
    promotePaths: [
      "lib/context-resolver/discovery/extract-cuisine-keyword.ts",
    ],
    descriptionKo: "로컬 검색용 요리 키워드 (cuisine 우선)",
  },
  {
    id: "events",
    labelKo: "행사",
    priority: "P2",
    promotePaths: ["lib/entity-resolver/catalogs/events.ts"],
    descriptionKo: "페스티벌·행사 토큰",
  },
  {
    id: "payment",
    labelKo: "결제",
    priority: "P2",
    promotePaths: ["lib/entity-resolver/catalogs/payment.ts"],
    descriptionKo: "결제 브랜드",
  },
  {
    id: "orgs",
    labelKo: "조직",
    priority: "P2",
    promotePaths: ["lib/entity-resolver/catalogs/orgs.ts"],
    descriptionKo: "기관·조직명",
  },
  {
    id: "osaka_demo_catalog",
    labelKo: "오사카 데모",
    priority: "P2",
    promotePaths: ["lib/search-engine/osaka-demo-catalog.ts"],
    descriptionKo: "데모 카탈로그 (프로덕션 전역 시드 아님)",
  },
  {
    id: "known_entities_kernel",
    labelKo: "커널 엔티티",
    priority: "P2",
    promotePaths: ["lib/event-kernel/entity/known-entity-catalog.ts"],
    descriptionKo: "채팅 커널용 브랜드·회사 (스카우트 geo 아님)",
  },
] as const;

const BY_ID = new Map(
  SEED_LEARNING_SECTOR_REGISTRY.map((row) => [row.id, row]),
);

export function getSeedLearningSector(
  id: SeedLearningSectorId,
): SeedLearningSectorDef | null {
  return BY_ID.get(id) ?? null;
}

export function listSeedLearningSectors(
  priority?: SeedLearningSectorDef["priority"],
): readonly SeedLearningSectorDef[] {
  if (!priority) {
    return SEED_LEARNING_SECTOR_REGISTRY;
  }
  return SEED_LEARNING_SECTOR_REGISTRY.filter((row) => row.priority === priority);
}

export function isSeedLearningSectorId(
  value: string,
): value is SeedLearningSectorId {
  return (SEED_LEARNING_SECTOR_IDS as readonly string[]).includes(value);
}

export function assertSectorRegistryComplete(): void {
  for (const id of SEED_LEARNING_SECTOR_IDS) {
    if (!BY_ID.has(id)) {
      throw new Error(`seed-learning sector missing registry row: ${id}`);
    }
  }
}
