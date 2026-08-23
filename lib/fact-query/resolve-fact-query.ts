import { classifyFactQuery } from "@/lib/fact-query/classify-fact-query";
import { runPoiHotspotsTool } from "@/lib/fact-query/tools/poi-hotspots";
import { runTransitMaxInterchangeTool } from "@/lib/fact-query/tools/transit-max-interchange";
import {
  runDistanceLookupTool,
  runWeatherLookupTool,
} from "@/lib/fact-query/tools/lookup-tools";
import { runScheduleFeasibilityTool } from "@/lib/fact-query/tools/schedule-feasibility";
import {
  resolveCityForTransitRoute,
  runTransitLastTrainTool,
  runTransitRouteLookupTool,
} from "@/lib/fact-query/tools/gtfs-transit-tools";
import { runMidpointMeetingTool } from "@/lib/fact-query/tools/midpoint-meeting";
import {
  resolveCityForTransitRealtime,
  runTransitRealtimeTool,
} from "@/lib/fact-query/tools/gtfs-rt-tools";
import {
  resolveCityForTransitCrowding,
  runTransitCrowdingTool,
} from "@/lib/fact-query/tools/transit-crowding-tools";
import type { FactAnswerWire } from "@/lib/fact-query/types";

function unsupportedAnswer(reasonKo: string): FactAnswerWire {
  return {
    queryId: `unsupported:${Date.now().toString(36)}`,
    kind: "unsupported",
    headlineKo: "아직 이 질문은 데이터가 없어요",
    summaryKo: reasonKo,
    evidence: [],
    highlightId: null,
    cityLabelKo: null,
    ranTool: false,
    sourceKo: "Rimvio Fact Query",
  };
}

/** Sync resolver — weather returns null (use resolveFactQueryAsync). */
export function resolveFactQuery(utterance: string): FactAnswerWire | null {
  const text = utterance.trim();
  if (!text || text.startsWith("@")) {
    return null;
  }

  const classification = classifyFactQuery(text);
  if (classification.kind === "unsupported") {
    return null;
  }

  if (classification.kind === "weather_lookup") {
    return null;
  }

  const cityId = classification.cityId ?? "tokyo";

  switch (classification.kind) {
    case "transit_max_interchange": {
      const answer = runTransitMaxInterchangeTool({ cityId });
      return (
        answer ??
        unsupportedAnswer(
          `${classification.cityLabelKo ?? "해당 도시"} 지하철 SSOT는 준비 중입니다.`,
        )
      );
    }
    case "poi_hotspots": {
      const answer = runPoiHotspotsTool({ cityId, limit: 5 });
      return (
        answer ??
        unsupportedAnswer(
          `${classification.cityLabelKo ?? "도시"} 핫플 인덱스는 준비 중입니다.`,
        )
      );
    }
    case "distance_lookup": {
      const answer = runDistanceLookupTool(text);
      return (
        answer ??
        unsupportedAnswer(
          "출발·도착 지명을 city anchor에서 찾지 못했어요. 예: 시부야에서 아사쿠사까지 거리",
        )
      );
    }
    case "schedule_feasibility": {
      const answer = runScheduleFeasibilityTool(text);
      return (
        answer ??
        unsupportedAnswer(
          "출발·목적지를 찾지 못했어요. 예: 난바에서 USJ 18시 출발 가능?",
        )
      );
    }
    case "transit_route_lookup": {
      const routeCityId = resolveCityForTransitRoute(
        text,
        classification.cityId,
      );
      const answer = runTransitRouteLookupTool({
        utterance: text,
        cityId: routeCityId,
      });
      return (
        answer ??
        unsupportedAnswer(
          "지하철 경로를 찾지 못했어요. 예: 강남에서 홍대입구까지 지하철로",
        )
      );
    }
    case "transit_last_train": {
      const lastCityId = classification.cityId ?? "tokyo";
      const answer = runTransitLastTrainTool({
        utterance: text,
        cityId: lastCityId,
      });
      return (
        answer ??
        unsupportedAnswer(
          `${classification.cityLabelKo ?? "해당 도시"} 막차 SSOT는 준비 중입니다.`,
        )
      );
    }
    case "midpoint_meeting": {
      const answer = runMidpointMeetingTool(text);
      return (
        answer ??
        unsupportedAnswer(
          "두 지명을 찾지 못했어요. 예: 강남과 홍대 중간 만남 장소",
        )
      );
    }
    case "transit_realtime_lookup": {
      const rtCityId = resolveCityForTransitRealtime(
        text,
        classification.cityId,
      );
      const answer = runTransitRealtimeTool({
        utterance: text,
        cityId: rtCityId,
      });
      return (
        answer ??
        unsupportedAnswer(
          "실시간 도착 정보를 찾지 못했어요. 예: 강남역 2호선 실시간 도착",
        )
      );
    }
    case "transit_crowding_lookup": {
      const crowdCityId = resolveCityForTransitCrowding(
        text,
        classification.cityId,
      );
      const answer = runTransitCrowdingTool({
        utterance: text,
        cityId: crowdCityId,
      });
      return (
        answer ??
        unsupportedAnswer(
          "역 혼잡도 데이터를 찾지 못했어요. 예: 강남역 혼잡도",
        )
      );
    }
    case "transit_station_lines":
      return unsupportedAnswer(
        "역별 노선 조회는 다음 단계에서 연결됩니다.",
      );
    default:
      return null;
  }
}

export async function resolveFactQueryAsync(
  utterance: string,
): Promise<FactAnswerWire | null> {
  const text = utterance.trim();
  if (!text || text.startsWith("@")) {
    return null;
  }

  const classification = classifyFactQuery(text);
  if (classification.kind === "weather_lookup") {
    const answer = await runWeatherLookupTool({
      utterance: text,
      fallbackCityId: classification.cityId,
    });
    return (
      answer ??
      unsupportedAnswer("날씨 API를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")
    );
  }

  return resolveFactQuery(text);
}

export { isFactQueryUtterance } from "@/lib/fact-query/classify-fact-query";
