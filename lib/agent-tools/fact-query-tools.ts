export const WEATHER_LOOKUP_TOOL_NAME = "weather_lookup" as const;

export const DISTANCE_LOOKUP_TOOL_NAME = "distance_lookup" as const;

export const WEATHER_LOOKUP_TOOL = {
  name: WEATHER_LOOKUP_TOOL_NAME,
  description: "도시/지역 현재 날씨·기온을 조회합니다.",
  parameters: {
    type: "object" as const,
    properties: {
      location: { type: "string" },
    },
    required: ["location"] as const,
  },
};

export const DISTANCE_LOOKUP_TOOL = {
  name: DISTANCE_LOOKUP_TOOL_NAME,
  description: "두 지점 간 직선 거리(km)를 계산합니다.",
  parameters: {
    type: "object" as const,
    properties: {
      from_label: { type: "string" },
      to_label: { type: "string" },
    },
    required: ["from_label", "to_label"] as const,
  },
};

export const TRANSIT_MAX_INTERCHANGE_TOOL_NAME =
  "transit_max_interchange_station" as const;

export const POI_HOTSPOTS_TOOL_NAME = "poi_hotspots" as const;

export const TRANSIT_MAX_INTERCHANGE_TOOL = {
  name: TRANSIT_MAX_INTERCHANGE_TOOL_NAME,
  description: "도시 지하철 그래프에서 환승 노선 수가 최대인 역을 계산합니다.",
  parameters: {
    type: "object" as const,
    properties: {
      city_id: { type: "string", description: "tokyo | osaka | seoul" },
    },
    required: ["city_id"] as const,
  },
};

export const POI_HOTSPOTS_TOOL = {
  name: POI_HOTSPOTS_TOOL_NAME,
  description: "도시 핫플/트렌드 장소 Top N을 반환합니다.",
  parameters: {
    type: "object" as const,
    properties: {
      city_id: { type: "string" },
      limit: { type: "number" },
    },
    required: ["city_id"] as const,
  },
};

export const SCHEDULE_FEASIBILITY_TOOL_NAME = "schedule_feasibility" as const;

export const SCHEDULE_FEASIBILITY_TOOL = {
  name: SCHEDULE_FEASIBILITY_TOOL_NAME,
  description:
    "숙소(앵커)에서 활동까지 이동·도착 시간 실현 가능성을 검증합니다.",
  parameters: {
    type: "object" as const,
    properties: {
      anchor_label: { type: "string" },
      activity_label: { type: "string" },
      leave_ready_minutes: { type: "number" },
      activity_close_minutes: { type: "number" },
    },
    required: ["anchor_label", "activity_label"] as const,
  },
};

export const TRANSIT_ROUTE_LOOKUP_TOOL_NAME = "transit_route_lookup" as const;

export const TRANSIT_LAST_TRAIN_TOOL_NAME = "transit_last_train" as const;

export const TRANSIT_ROUTE_LOOKUP_TOOL = {
  name: TRANSIT_ROUTE_LOOKUP_TOOL_NAME,
  description: "두 역 간 지하철 경로(환승 포함)를 SSOT 그래프로 계산합니다.",
  parameters: {
    type: "object" as const,
    properties: {
      city_id: { type: "string" },
      from_label: { type: "string" },
      to_label: { type: "string" },
    },
    required: ["city_id", "from_label", "to_label"] as const,
  },
};

export const TRANSIT_LAST_TRAIN_TOOL = {
  name: TRANSIT_LAST_TRAIN_TOOL_NAME,
  description: "도시·노선별 대표 막차 시각을 반환합니다 (GTFS stub).",
  parameters: {
    type: "object" as const,
    properties: {
      city_id: { type: "string" },
      line_id: { type: "string" },
    },
    required: ["city_id"] as const,
  },
};

export const MIDPOINT_MEETING_TOOL_NAME = "midpoint_meeting" as const;

export const MIDPOINT_MEETING_TOOL = {
  name: MIDPOINT_MEETING_TOOL_NAME,
  description: "두 지점의 지리·교통 중간 만남 장소를 추천합니다.",
  parameters: {
    type: "object" as const,
    properties: {
      place_a_label: { type: "string" },
      place_b_label: { type: "string" },
    },
    required: ["place_a_label", "place_b_label"] as const,
  },
};
