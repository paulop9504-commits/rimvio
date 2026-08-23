/** City / landmark anchors for distance + map projection. */

export type CityAnchor = {
  readonly id: string;
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
};

export const CITY_ANCHORS: readonly CityAnchor[] = [
  { id: "tokyo", labelKo: "도쿄", lat: 35.6762, lng: 139.6503 },
  { id: "osaka", labelKo: "오사카", lat: 34.6937, lng: 135.5023 },
  { id: "seoul", labelKo: "서울", lat: 37.5665, lng: 126.978 },
  { id: "shibuya", labelKo: "시부야", lat: 35.658, lng: 139.7016 },
  { id: "shinjuku", labelKo: "신주쿠", lat: 35.6896, lng: 139.7006 },
  { id: "asakusa", labelKo: "아사쿠사", lat: 35.7108, lng: 139.7967 },
  { id: "namba", labelKo: "난바", lat: 34.6654, lng: 135.5013 },
  { id: "umeda", labelKo: "우메다", lat: 34.7055, lng: 135.4983 },
  { id: "dotonbori", labelKo: "도톤보리", lat: 34.6687, lng: 135.5013 },
  { id: "osaka-castle", labelKo: "오사카성", lat: 34.6873, lng: 135.5262 },
  { id: "gangnam", labelKo: "강남", lat: 37.4979, lng: 127.0276 },
  { id: "hongdae", labelKo: "홍대", lat: 37.5572, lng: 126.9244 },
  { id: "myeongdong", labelKo: "명동", lat: 37.5609, lng: 126.9863 },
];

export function resolvePlaceAnchor(query: string): CityAnchor | null {
  const q = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!q) return null;
  for (const row of CITY_ANCHORS) {
    const label = row.labelKo.toLowerCase().replace(/\s+/g, "");
    if (q === label || q.includes(label) || label.includes(q)) {
      return row;
    }
  }
  if (/東京|tokyo/u.test(q)) return CITY_ANCHORS.find((a) => a.id === "tokyo") ?? null;
  if (/大阪|osaka/u.test(q)) return CITY_ANCHORS.find((a) => a.id === "osaka") ?? null;
  if (/서울|seoul/u.test(q)) return CITY_ANCHORS.find((a) => a.id === "seoul") ?? null;
  return null;
}

export function cityAnchorById(cityId: string): CityAnchor | null {
  return CITY_ANCHORS.find((a) => a.id === cityId) ?? null;
}
