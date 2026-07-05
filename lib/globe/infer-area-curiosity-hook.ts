import type { BrainSurfaceCandidateFamily } from "@/lib/situation-projection/brain-surface-types";
import { inferMapRegionFromCoords } from "@/lib/globe/geo-region-from-coords";

export type MapRegionBias = "kr" | "jp" | "global";

export {
  inferCountryCodeFromCoords,
  isCoordInJapan,
  isCoordInKorea,
} from "@/lib/globe/geo-region-from-coords";

export function inferMapRegionBias(input: {
  lat?: number | null;
  lng?: number | null;
  areaLabel?: string | null;
}): MapRegionBias {
  const lat = input.lat;
  const lng = input.lng;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    const coordRegion = inferMapRegionFromCoords(lat, lng);
    if (coordRegion) {
      return coordRegion;
    }
  }

  const label = input.areaLabel?.trim() ?? "";
  if (/(도쿄|東京|tokyo|오사카|大阪|osaka|교토|kyoto|후쿠오카|fukuoka|삿포로|sapporo|세타가야|setagaya|일본|japan)/iu.test(label)) {
    return "jp";
  }
  if (/(서울|부산|대전|대구|광주|인천|제주|한국|korea)/iu.test(label)) {
    return "kr";
  }
  return "global";
}

function normalizeAreaToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "");
}

function matchAreaHook(areaLabel: string, hooks: Record<string, string>): string | null {
  const token = normalizeAreaToken(areaLabel);
  for (const [key, line] of Object.entries(hooks)) {
    if (key !== "default" && token.includes(normalizeAreaToken(key))) {
      return line;
    }
  }
  return hooks.default ?? null;
}

const GLOBAL_AREA_HOOKS: Record<string, string> = {
  default: "한 블록만 정해도 동선이 갈라져요",
};

const KR_AREA_HOOKS: Record<string, string> = {
  default: "골목 하나만 잡아도 동선이 갈라져요",
  홍대: "낮엔 카페, 밤엔 골목이 바뀌는 쪽이에요",
  연남: "산책하다 들르기 좋은 골목이 이어져요",
  성수: "공장골목과 브런치 거리가 섞여 있어요",
  강남: "역 주변과 골목의 리듬이 달라요",
  대전: "대학가와 옛 도심 사이가 가까워요",
  제주: "해안선 따라 분위기가 달라지는 편이에요",
};

const JP_AREA_HOOKS: Record<string, string> = {
  default: "역 하나만 정해도 골목 분위기가 갈라져요",
  도쿄: "낮과 밤에 다른 골목이 많은 도시예요",
  tokyo: "낮과 밤에 다른 골목이 많은 도시예요",
  신주쿠: "네온 골목과 조용한 골목이 바로 옆이에요",
  shinjuku: "네온 골목과 조용한 골목이 바로 옆이에요",
  시부야: "교차로에서 골목으로 들어가면 분위기가 달라져요",
  shibuya: "교차로에서 골목으로 들어가면 분위기가 달라져요",
  오사카: "먹거리 골목이 밀집한 쪽이 뚜렷해요",
  osaka: "먹거리 골목이 밀집한 쪽이 뚜렷해요",
  교토: "사찰 골목과 상점 거리가 짧게 이어져요",
  kyoto: "사찰 골목과 상점 거리가 짧게 이어져요",
  나카노: "로컬 상점골목이 조용히 이어지는 쪽이에요",
  nakano: "로컬 상점골목이 조용히 이어지는 쪽이에요",
};

function familyHook(
  family: BrainSurfaceCandidateFamily | null | undefined,
  region: MapRegionBias,
): string | null {
  switch (family) {
    case "eatery":
      return region === "jp"
        ? "저녁에 들를 만한 골목이 따로 있어요"
        : "한 끼만 정해도 동선이 잡혀요";
    case "lodging":
      return region === "jp"
        ? "역과 골목 사이 어디에 묶일지가 관건이에요"
        : "머무는 쪽만 정해도 동선이 가벼워져요";
    case "media":
      return "영상에서 본 분위기가 이 근처일 수 있어요";
    case "trace_place":
      return "영상 단서가 이 근처 후보를 가리켜요";
    default:
      return null;
  }
}

/** L1 curiosity hook — area name + one line that invites exploration. */
export function buildAreaCuriosityHook(input: {
  areaLabel: string;
  lat?: number | null;
  lng?: number | null;
  family?: BrainSurfaceCandidateFamily | null;
  nodeLabel?: string | null;
}): string {
  const areaLabel = input.areaLabel.trim() || input.nodeLabel?.trim() || "이 근처";
  const region = inferMapRegionBias({
    lat: input.lat,
    lng: input.lng,
    areaLabel,
  });
  const regional =
    region === "jp"
      ? matchAreaHook(areaLabel, JP_AREA_HOOKS)
      : region === "kr"
        ? matchAreaHook(areaLabel, KR_AREA_HOOKS)
        : matchAreaHook(areaLabel, GLOBAL_AREA_HOOKS);
  return familyHook(input.family, region) ?? regional ?? GLOBAL_AREA_HOOKS.default!;
}

export function buildAreaCuriosityPreview(input: {
  areaLabel: string;
  lat?: number | null;
  lng?: number | null;
  family?: BrainSurfaceCandidateFamily | null;
  detailLine?: string | null;
}): string {
  const hook = buildAreaCuriosityHook(input);
  const detail = input.detailLine?.trim();
  if (!detail || detail === hook) {
    return hook;
  }
  return `${hook} · ${detail}`;
}
