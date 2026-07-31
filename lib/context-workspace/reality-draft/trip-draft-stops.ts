/**
 * Trip draft stop catalog — spatial seeds for Reality Draft compiler.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import { OSAKA_APA_NAMBA } from "@/lib/search-engine/osaka-demo-catalog";

export type TripDraftStop = {
  readonly id: string;
  readonly kind: ContextWorkspaceNode["kind"];
  readonly title: string;
  readonly lat: number;
  readonly lng: number;
  readonly amountLabel: string | null;
  readonly walkMinutes: number;
  readonly tags: readonly string[];
  readonly rating: number;
  readonly indoor: boolean;
};

/** Osaka spatial Reality Draft — real-world anchors (Prepared / READY). */
export const OSAKA_TRIP_DRAFT_STOPS: readonly TripDraftStop[] = [
  {
    id: "amenity:osaka:kix",
    kind: "amenity",
    title: "간사이 국제공항",
    lat: 34.4347,
    lng: 135.2441,
    amountLabel: null,
    walkMinutes: 0,
    tags: ["airport", "arrival", "kix", "flight"],
    rating: 4.2,
    indoor: true,
  },
  {
    id: OSAKA_APA_NAMBA.id,
    kind: "lodging",
    title: "APA 난바",
    lat: OSAKA_APA_NAMBA.lat,
    lng: OSAKA_APA_NAMBA.lng,
    amountLabel: "₩12만/박",
    walkMinutes: 45,
    tags: ["lodging", "reservable", "실내", "stay"],
    rating: 4.3,
    indoor: true,
  },
  {
    id: "poi:osaka:usj",
    kind: "poi",
    title: "유니버설 스튜디오 재팬",
    lat: 34.6654,
    lng: 135.4323,
    amountLabel: "티켓",
    walkMinutes: 25,
    tags: ["usj", "experience", "theme_park", "ticket"],
    rating: 4.6,
    indoor: false,
  },
  {
    id: "poi:osaka:namba-parks",
    kind: "poi",
    title: "난바 파크스",
    lat: 34.6615,
    lng: 135.5022,
    amountLabel: null,
    walkMinutes: 8,
    tags: ["anchor", "mall", "실내"],
    rating: 4.4,
    indoor: true,
  },
  {
    id: "poi:osaka:dotonbori",
    kind: "poi",
    title: "도톤보리",
    lat: 34.6687,
    lng: 135.5013,
    amountLabel: null,
    walkMinutes: 10,
    tags: ["photo_spot", "야외", "landmark", "food_area"],
    rating: 4.6,
    indoor: false,
  },
  {
    id: "poi:osaka:kuromon",
    kind: "poi",
    title: "쿠로몬 시장",
    lat: 34.6662,
    lng: 135.5063,
    amountLabel: "₩13k",
    walkMinutes: 13,
    tags: ["실내", "market", "food", "rain_safe"],
    rating: 4.5,
    indoor: true,
  },
  {
    id: "eatery:osaka:endouroji",
    kind: "eatery",
    title: "엔도지로지",
    lat: 34.6641,
    lng: 135.4998,
    amountLabel: "₩2만",
    walkMinutes: 12,
    tags: ["local_favorite", "실내", "reservable", "food"],
    rating: 4.7,
    indoor: true,
  },
];
