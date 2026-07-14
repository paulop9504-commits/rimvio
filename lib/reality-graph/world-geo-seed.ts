import type { WorldGeoEntityId, WorldGeoNode } from "@/lib/reality-graph/types";

/**
 * Seed World Graph (Japan MVP). Catalog SSOT — not LLM memory.
 * Expand via normalized external geo imports later; keep ids stable.
 */
export const WORLD_GEO_SEED: readonly WorldGeoNode[] = [
  {
    id: "geo:world",
    kind: "world",
    parentId: null,
    labels: { ko: "세계", en: "World" },
    centroid: { lat: 0, lng: 0 },
    boundary: null,
    ianaTimeZone: null,
    currencyCode: null,
    primaryLanguage: null,
  },
  {
    id: "geo:asia",
    kind: "continent",
    parentId: "geo:world",
    labels: { ko: "아시아", en: "Asia" },
    centroid: { lat: 34, lng: 100 },
    boundary: null,
    ianaTimeZone: null,
    currencyCode: null,
    primaryLanguage: null,
  },
  {
    id: "geo:jp",
    kind: "country",
    parentId: "geo:asia",
    labels: {
      ko: "일본",
      en: "Japan",
      local: "日本",
      aliases: ["japan", "일본", "jp", "日本"],
    },
    centroid: { lat: 36.2048, lng: 138.2529 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
  {
    id: "geo:jp:tokyo",
    kind: "metropolis",
    parentId: "geo:jp",
    labels: {
      ko: "도쿄도",
      en: "Tokyo Metropolis",
      local: "東京都",
      aliases: [
        "tokyo",
        "도쿄",
        "동경",
        "tokyo metropolis",
        "도쿄도",
        "東京都",
        "tokyo-to",
        "東京都",
      ],
    },
    centroid: { lat: 35.6762, lng: 139.6503 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
  {
    id: "geo:jp:tokyo:shinjuku",
    kind: "ward",
    parentId: "geo:jp:tokyo",
    labels: {
      ko: "신주쿠구",
      en: "Shinjuku City",
      local: "新宿区",
      aliases: ["shinjuku", "신주쿠", "新宿", "shinjuku-ku", "신주쿠구"],
    },
    centroid: { lat: 35.6938, lng: 139.7034 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
  {
    id: "geo:jp:tokyo:shinjuku:kabukicho",
    kind: "neighborhood",
    parentId: "geo:jp:tokyo:shinjuku",
    labels: {
      ko: "가부키초",
      en: "Kabukicho",
      local: "歌舞伎町",
      aliases: ["kabukicho", "가부키초", "歌舞伎町", "kabuki-cho"],
    },
    centroid: { lat: 35.6951, lng: 139.7028 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
  {
    id: "geo:jp:tokyo:shibuya",
    kind: "ward",
    parentId: "geo:jp:tokyo",
    labels: {
      ko: "시부야구",
      en: "Shibuya City",
      local: "渋谷区",
      aliases: ["shibuya", "시부야", "渋谷", "shibuya-ku"],
    },
    centroid: { lat: 35.6595, lng: 139.7004 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
  {
    id: "geo:jp:tokyo:ginza",
    kind: "district",
    parentId: "geo:jp:tokyo",
    labels: {
      ko: "긴자",
      en: "Ginza",
      local: "銀座",
      aliases: ["ginza", "긴자", "銀座"],
    },
    centroid: { lat: 35.6717, lng: 139.765 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
  {
    id: "geo:jp:tokyo:akihabara",
    kind: "district",
    parentId: "geo:jp:tokyo",
    labels: {
      ko: "아키하바라",
      en: "Akihabara",
      local: "秋葉原",
      aliases: ["akihabara", "아키하바라", "秋葉原", "akiba"],
    },
    centroid: { lat: 35.6984, lng: 139.7731 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
  {
    id: "geo:jp:osaka",
    kind: "prefecture",
    parentId: "geo:jp",
    labels: {
      ko: "오사카부",
      en: "Osaka Prefecture",
      local: "大阪府",
      aliases: ["osaka", "오사카", "大阪", "osaka prefecture", "오사카부"],
    },
    centroid: { lat: 34.6937, lng: 135.5023 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
  {
    id: "geo:jp:kyoto",
    kind: "prefecture",
    parentId: "geo:jp",
    labels: {
      ko: "교토부",
      en: "Kyoto Prefecture",
      local: "京都府",
      aliases: ["kyoto", "교토", "京都", "kyoto prefecture", "교토부"],
    },
    centroid: { lat: 35.0116, lng: 135.7681 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
  {
    id: "geo:jp:hokkaido",
    kind: "prefecture",
    parentId: "geo:jp",
    labels: {
      ko: "홋카이도",
      en: "Hokkaido",
      local: "北海道",
      aliases: ["hokkaido", "홋카이도", "北海道", "sapporo"],
    },
    centroid: { lat: 43.0618, lng: 141.3545 },
    boundary: null,
    ianaTimeZone: "Asia/Tokyo",
    currencyCode: "JPY",
    primaryLanguage: "ja",
  },
] as const;

const BY_ID = new Map<WorldGeoEntityId, WorldGeoNode>(
  WORLD_GEO_SEED.map((node) => [node.id, node]),
);

export function getWorldGeoNode(id: WorldGeoEntityId): WorldGeoNode | null {
  return BY_ID.get(id) ?? null;
}

export function listWorldGeoChildren(parentId: WorldGeoEntityId): WorldGeoNode[] {
  return WORLD_GEO_SEED.filter((node) => node.parentId === parentId);
}

export function listWorldGeoSeed(): readonly WorldGeoNode[] {
  return WORLD_GEO_SEED;
}
