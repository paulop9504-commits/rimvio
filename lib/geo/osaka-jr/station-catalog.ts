/**
 * Osaka JR hub stations — Normalize IR for Reality Provider absorb.
 */

import type { OsakaJrLineId } from "@/lib/geo/osaka-jr/line-catalog";

export type OsakaJrStation = {
  readonly id: string;
  readonly nameKo: string;
  readonly lineIds: readonly OsakaJrLineId[];
  readonly lng: number;
  readonly lat: number;
  readonly hub?: boolean;
};

export const OSAKA_JR_STATIONS: readonly OsakaJrStation[] = [
  {
    id: "jr:osaka",
    nameKo: "오사카",
    lineIds: ["jr_osaka_loop", "jr_kyoto", "jr_kobe"],
    lng: 135.4985,
    lat: 34.7025,
    hub: true,
  },
  {
    id: "jr:kyobashi",
    nameKo: "교바시",
    lineIds: ["jr_osaka_loop"],
    lng: 135.5285,
    lat: 34.6965,
    hub: true,
  },
  {
    id: "jr:tsuruhashi",
    nameKo: "쓰루하시",
    lineIds: ["jr_osaka_loop"],
    lng: 135.5305,
    lat: 34.6655,
    hub: true,
  },
  {
    id: "jr:tennoji",
    nameKo: "덴노지",
    lineIds: ["jr_osaka_loop", "jr_hanwa", "jr_yamatoji"],
    lng: 135.5132,
    lat: 34.6471,
    hub: true,
  },
  {
    id: "jr:nishikujo",
    nameKo: "니시쿠조",
    lineIds: ["jr_osaka_loop", "jr_yumesaki"],
    lng: 135.4669,
    lat: 34.6817,
    hub: true,
  },
  {
    id: "jr:universal-city",
    nameKo: "유니버설시티",
    lineIds: ["jr_yumesaki"],
    lng: 135.4389,
    lat: 34.6678,
    hub: true,
  },
  {
    id: "jr:shin-osaka",
    nameKo: "신오사카",
    lineIds: ["jr_kyoto"],
    lng: 135.5,
    lat: 34.733,
    hub: true,
  },
  {
    id: "jr:sannomiya",
    nameKo: "산노미야",
    lineIds: ["jr_kobe"],
    lng: 135.195,
    lat: 34.68,
    hub: true,
  },
] as const;
