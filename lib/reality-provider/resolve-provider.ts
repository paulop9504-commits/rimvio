/**
 * Need → Reality Provider candidates (priority ordered).
 */

import type {
  RealityNeed,
  RealityProviderCandidate,
  RealityProviderResolution,
} from "@/lib/reality-provider/types";

function candidatesForNeed(
  need: RealityNeed,
): readonly RealityProviderCandidate[] {
  switch (need.needId) {
    case "metro_network":
      return [
        {
          providerId: "cached_overlay",
          priority: 100,
          reasonKo: "오사카·도시 메트로 캐시 오버레이",
        },
        {
          providerId: "osm",
          priority: 40,
          reasonKo: "OSM subway relations",
        },
      ];
    case "shinkansen_network":
      return [
        {
          providerId: "cached_overlay",
          priority: 100,
          reasonKo: "신칸센 캐시 오버레이",
        },
        {
          providerId: "osm",
          priority: 30,
          reasonKo: "OSM shinkansen routes",
        },
      ];
    case "rail_network": {
      const korea =
        need.regionKo === "한국" ||
        need.operatorHint === "korail" ||
        /한국|KTX|전국\s*노선/iu.test(need.utterance);
      if (korea) {
        return [
          {
            providerId: "cached_overlay",
            priority: 100,
            reasonKo: "한국 철도 캐시 오버레이",
          },
          {
            providerId: "gtfs",
            priority: 40,
            reasonKo: "GTFS (미연결)",
          },
        ];
      }
      return [
        {
          providerId: "cached_overlay",
          priority: 80,
          reasonKo: "오사카 JR 캐시 오버레이",
        },
        {
          providerId: "gtfs",
          priority: 50,
          reasonKo: "GTFS rail feed (미연결)",
        },
        {
          providerId: "osm",
          priority: 40,
          reasonKo: "OSM rail routes",
        },
      ];
    }
    case "poi_geometry":
      return [
        {
          providerId: "osm",
          priority: 100,
          reasonKo: "Nominatim / OSM polygon_geojson",
        },
        {
          providerId: "cached_overlay",
          priority: 40,
          reasonKo: "시드 footprint (오프라인 폴백)",
        },
      ];
    case "poi_set":
    case "event_set":
    case "amenity_set":
      return [
        {
          providerId: "vendor_api",
          priority: 80,
          reasonKo: "도메인 Vendor / Maps",
        },
        {
          providerId: "osm",
          priority: 50,
          reasonKo: "OSM POI / amenity",
        },
        {
          providerId: "workspace_graph",
          priority: 20,
          reasonKo: "이미 Workspace에 있는 객체",
        },
      ];
    default:
      return [];
  }
}

/**
 * Resolve provider order for a Need. selected = highest priority candidate.
 */
export function resolveRealityProvider(
  need: RealityNeed,
): RealityProviderResolution {
  const candidates = [...candidatesForNeed(need)].sort(
    (a, b) => b.priority - a.priority,
  );
  return {
    need,
    candidates,
    selected: candidates[0] ?? null,
  };
}
