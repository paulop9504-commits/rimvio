/**
 * Demo Local Delivery — one service, two role contexts.
 */

import type { ExperienceService, MenuItem, StoreRecord } from "@/lib/experience-app/types";
import {
  createExperienceOrder,
  listExperienceOrders,
} from "@/lib/experience-app/order-store";

export const LOCAL_DELIVERY_SERVICE: ExperienceService = {
  id: "local-delivery",
  name: "Local Delivery",
  nameKo: "동네 배달",
  merchantNav: [
    { id: "dashboard", labelKo: "현황" },
    { id: "orders", labelKo: "주문 관리" },
    { id: "stores", labelKo: "매장 관리" },
    { id: "customers", labelKo: "고객 관리" },
    { id: "settlement", labelKo: "정산" },
  ],
};

export const EXPERIENCE_SERVICES: readonly ExperienceService[] = [
  LOCAL_DELIVERY_SERVICE,
  { id: "my-mall", name: "Commerce", nameKo: "내 쇼핑몰", merchantNav: [] },
  { id: "travel-booking", name: "Travel", nameKo: "여행 예약", merchantNav: [] },
];

export const DEMO_STORES: readonly StoreRecord[] = [
  {
    id: "store_42",
    serviceId: "local-delivery",
    name: "BHC 역삼점",
    categoryKo: "치킨",
    walkMinutes: 6,
    lat: 37.501,
    lng: 127.037,
  },
  {
    id: "store_43",
    serviceId: "local-delivery",
    name: "교촌치킨 강남점",
    categoryKo: "치킨",
    walkMinutes: 9,
    lat: 37.498,
    lng: 127.028,
  },
  {
    id: "store_44",
    serviceId: "local-delivery",
    name: "60계 선릉점",
    categoryKo: "치킨",
    walkMinutes: 12,
    lat: 37.504,
    lng: 127.049,
  },
];

export const DEMO_MENU: readonly MenuItem[] = [
  { id: "m1", storeId: "store_42", name: "뿌링클", categoryKo: "추천", priceKrw: 23000, recommended: true },
  { id: "m2", storeId: "store_42", name: "맛초킹", categoryKo: "치킨", priceKrw: 22000 },
  { id: "m3", storeId: "store_42", name: "치즈볼", categoryKo: "사이드", priceKrw: 6000, recommended: true },
  { id: "m4", storeId: "store_42", name: "콜라", categoryKo: "음료", priceKrw: 2000 },
  { id: "m5", storeId: "store_43", name: "허니콤보", categoryKo: "추천", priceKrw: 24000, recommended: true },
  { id: "m6", storeId: "store_44", name: "핫후라이드", categoryKo: "추천", priceKrw: 21000, recommended: true },
];

export function storesForQuery(query: string): readonly StoreRecord[] {
  const q = query.trim().toLowerCase();
  if (!q || /치킨|chicken|근처|주변|주문/.test(q)) return DEMO_STORES;
  return DEMO_STORES.filter((s) => s.name.toLowerCase().includes(q) || s.categoryKo.includes(q));
}

export function menuForStore(storeId: string): readonly MenuItem[] {
  return DEMO_MENU.filter((m) => m.storeId === storeId);
}

export function seedDemoOrdersIfEmpty(): void {
  if (listExperienceOrders().length > 0) return;
  createExperienceOrder({
    storeId: "store_42",
    storeName: "BHC 역삼점",
    consumerId: "user_102",
    lines: [
      { name: "뿌링클", qty: 1, priceKrw: 23000 },
      { name: "치즈볼", qty: 1, priceKrw: 6000 },
    ],
  });
  createExperienceOrder({
    storeId: "store_42",
    storeName: "BHC 역삼점",
    consumerId: "user_88",
    lines: [{ name: "맛초킹", qty: 2, priceKrw: 22000 }],
  });
}
