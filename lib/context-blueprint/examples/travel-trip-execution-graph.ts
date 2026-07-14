/**
 * Method 2 reference — Trip → Prepare → Departure → Arrival → Stay → Explore → Return.
 * Each node: Spatial Target → Resources → Actions.
 */

import { composeExecutionNodeAction } from "@/lib/context-blueprint/execution-node-action";
import {
  composeExecutionGraph,
  type ExecutionGraph,
} from "@/lib/context-blueprint/execution-graph";
import {
  composeDigitalSpatialTarget,
  composePhysicalSpatialTarget,
} from "@/lib/context-blueprint/spatial-target";
import {
  composeSpatialTargets,
  type SpatialTargets,
} from "@/lib/context-blueprint/spatial-targets";
import {
  composeTemporalTargets,
  type TemporalTargets,
} from "@/lib/context-blueprint/temporal-targets";
import { composeContextBlueprint, type ContextBlueprint } from "@/lib/context-blueprint/types";
import { composeEmptyNodeResourceState } from "@/lib/context-blueprint/node-resource-state";

export function composeTravelTripExecutionGraph(): ExecutionGraph {
  return composeExecutionGraph({
    nodes: [
      {
        id: "trip",
        kind: "trip",
        label: "Trip",
        resolution: "hypothesis",
        resourceKinds: ["schedule"],
        actions: [],
        assignedExecutor: "travel",
      },
      {
        id: "prepare",
        kind: "prepare",
        label: "Prepare",
        resolution: "confirmed",
        resourceKinds: ["documents", "payment"],
        actions: [
          composeExecutionNodeAction({
            id: "prepare-passport",
            kind: "check",
            label: "여권 확인",
            executorHint: "travel",
          }),
          composeExecutionNodeAction({
            id: "prepare-pack",
            kind: "pack",
            label: "짐 싸기",
            executorHint: "travel",
          }),
          composeExecutionNodeAction({
            id: "prepare-fx",
            kind: "exchange",
            label: "환전",
            executorHint: "finance",
          }),
        ],
        assignedExecutor: "travel",
      },
      {
        id: "departure",
        kind: "departure",
        label: "Departure",
        resolution: "confirmed",
        resourceKinds: ["flight", "ticket", "transit"],
        actions: [
          composeExecutionNodeAction({
            id: "departure-checkin",
            kind: "check_in",
            label: "체크인",
            executorHint: "transit",
          }),
          composeExecutionNodeAction({
            id: "departure-baggage",
            kind: "baggage",
            label: "수하물",
            executorHint: "transit",
          }),
          composeExecutionNodeAction({
            id: "departure-board",
            kind: "board",
            label: "탑승",
            executorHint: "transit",
          }),
        ],
        assignedExecutor: "transit",
        resourceState: composeEmptyNodeResourceState({
          dateDependent: true,
          anchorRef: null,
        }),
      },
      {
        id: "arrival",
        kind: "arrival",
        label: "Arrival",
        resolution: "hypothesis",
        resourceKinds: ["transit"],
        actions: [
          composeExecutionNodeAction({
            id: "arrival-transit",
            kind: "navigate",
            label: "숙소 방향 이동",
            executorHint: "transit",
          }),
        ],
        assignedExecutor: "transit",
      },
      {
        id: "stay",
        kind: "stay",
        label: "Stay",
        resolution: "unresolved",
        resourceKinds: ["lodging"],
        actions: [
          composeExecutionNodeAction({
            id: "stay-hotel",
            kind: "book",
            label: "호텔",
            executorHint: "lodging",
          }),
          composeExecutionNodeAction({
            id: "stay-checkin",
            kind: "hotel_check_in",
            label: "체크인",
            executorHint: "lodging",
          }),
        ],
        assignedExecutor: "lodging",
        resourceState: composeEmptyNodeResourceState({
          dateDependent: true,
          anchorRef: "destination",
        }),
      },
      {
        id: "explore",
        kind: "explore",
        label: "Explore",
        resolution: "hypothesis",
        resourceKinds: ["eatery", "ticket"],
        actions: [
          composeExecutionNodeAction({
            id: "explore-eatery",
            kind: "navigate",
            label: "식사 · 관광",
            executorHint: "eatery",
          }),
        ],
        assignedExecutor: "eatery",
        resourceState: composeEmptyNodeResourceState({
          dateDependent: false,
          anchorRef: "destination",
        }),
      },
      {
        id: "return",
        kind: "return",
        label: "Return",
        resolution: "hypothesis",
        resourceKinds: ["flight", "transit"],
        actions: [
          composeExecutionNodeAction({
            id: "return-airport",
            kind: "navigate",
            label: "공항 이동",
            executorHint: "transit",
          }),
          composeExecutionNodeAction({
            id: "return-board",
            kind: "board",
            label: "귀국 탑승",
            executorHint: "transit",
          }),
        ],
        assignedExecutor: "transit",
      },
    ],
    edges: [
      { fromNodeId: "trip", toNodeId: "prepare" },
      { fromNodeId: "prepare", toNodeId: "departure" },
      { fromNodeId: "departure", toNodeId: "arrival" },
      { fromNodeId: "arrival", toNodeId: "stay" },
      { fromNodeId: "stay", toNodeId: "explore" },
      { fromNodeId: "explore", toNodeId: "return" },
    ],
  });
}

export function composeTravelTripSpatialTargets(): SpatialTargets {
  return composeSpatialTargets({
    byNodeId: {
      prepare: composePhysicalSpatialTarget({
        label: "집",
        resolution: "confirmed",
      }),
      departure: composePhysicalSpatialTarget({
        label: "인천공항",
        resolution: "confirmed",
        zoneId: "incheon-airport",
      }),
      arrival: composePhysicalSpatialTarget({
        label: "간사이공항",
        resolution: "hypothesis",
        zoneId: "kansai-airport",
      }),
      stay: composePhysicalSpatialTarget({
        label: "오사카",
        resolution: "unresolved",
        linkedSlotId: "destination",
      }),
      explore: composePhysicalSpatialTarget({
        label: "오사카 시내",
        resolution: "hypothesis",
        linkedSlotId: "destination",
      }),
      return: composePhysicalSpatialTarget({
        label: "인천공항",
        resolution: "hypothesis",
        zoneId: "incheon-airport",
      }),
    },
  });
}

/** Country-scale Japan — stay/city unresolved until user picks Osaka/Tokyo/Fukuoka. */
export function composeJapanTravelTripSpatialTargets(): SpatialTargets {
  return composeSpatialTargets({
    byNodeId: {
      prepare: composePhysicalSpatialTarget({
        label: "집",
        resolution: "confirmed",
      }),
      departure: composePhysicalSpatialTarget({
        label: "인천공항",
        resolution: "confirmed",
        zoneId: "incheon-airport",
      }),
      arrival: composePhysicalSpatialTarget({
        label: "일본 도착",
        resolution: "unresolved",
        linkedSlotId: "destination",
        zoneId: "japan-arrival",
      }),
      stay: composePhysicalSpatialTarget({
        label: "일본 숙소 권역",
        resolution: "unresolved",
        linkedSlotId: "destination",
      }),
      explore: composePhysicalSpatialTarget({
        label: "일본",
        resolution: "hypothesis",
        linkedSlotId: "destination",
      }),
      return: composePhysicalSpatialTarget({
        label: "인천공항",
        resolution: "hypothesis",
        zoneId: "incheon-airport",
      }),
    },
  });
}

export function composeTravelTripTemporalTargets(): TemporalTargets {
  return composeTemporalTargets({
    byNodeId: {
      prepare: {
        resolution: "hypothesis",
        label: "출발 전",
        flexible: true,
      },
      departure: {
        resolution: "hypothesis",
        label: "출발일",
        flexible: false,
      },
      stay: {
        resolution: "unresolved",
        label: "체류 기간",
        flexible: true,
      },
    },
  });
}

export function composeTravelTripBlueprint(input: {
  contextId: string;
  bridgeId?: string;
  runtimeId?: string;
  goal?: string;
  /** Country-scale frame — do not pin Osaka as stay until city pick. */
  regionFrame?: "japan" | null;
}): ContextBlueprint {
  const executionGraph = composeTravelTripExecutionGraph();
  const japan = input.regionFrame === "japan";
  return composeContextBlueprint({
    containerKind: "travel",
    contextId: input.contextId,
    bridgeId: input.bridgeId,
    runtimeId: input.runtimeId,
    goal: input.goal ?? (japan ? "일본 여행" : "여행"),
    executionGraph,
    spatialTargets: japan
      ? composeJapanTravelTripSpatialTargets()
      : composeTravelTripSpatialTargets(),
    temporalTargets: composeTravelTripTemporalTargets(),
    resourcePlan: {
      requiredResources: ["flight", "lodging", "transit", "eatery", "documents", "payment"],
      knownTruth: [],
      emptySlots: ["destination", "lodging_place"],
      nextQuestion: {
        slotId: "destination",
        promptKo: japan
          ? "어디부터 시작할까요? 오사카 · 도쿄 · 후쿠오카"
          : "어디로 갈까요?",
      },
    },
    assignedExecutors: ["travel", "lodging", "transit", "eatery", "finance"],
    approvalPolicy: "manual",
  });
}

/** Trade vertical — Listing → Negotiation → Meeting → Payment → Complete */
export function composeTradeExecutionGraph(): ExecutionGraph {
  return composeExecutionGraph({
    nodes: [
      {
        id: "listing",
        kind: "listing",
        label: "Listing",
        resolution: "confirmed",
        resourceKinds: ["inventory"],
        actions: [
          composeExecutionNodeAction({
            id: "listing-photo",
            kind: "list",
            label: "물품 등록",
            executorHint: "trade",
          }),
        ],
        assignedExecutor: "trade",
      },
      {
        id: "negotiation",
        kind: "negotiation",
        label: "Negotiation",
        resolution: "confirmed",
        resourceKinds: ["people"],
        actions: [
          composeExecutionNodeAction({
            id: "negotiation-chat",
            kind: "chat",
            label: "채팅",
            executorHint: "trade",
          }),
        ],
        assignedExecutor: "trade",
      },
      {
        id: "meeting",
        kind: "meeting",
        label: "Meeting",
        resolution: "hypothesis",
        resourceKinds: ["payment"],
        actions: [
          composeExecutionNodeAction({
            id: "meeting-handoff",
            kind: "meet",
            label: "직거래",
            executorHint: "trade",
          }),
        ],
        assignedExecutor: "trade",
      },
      {
        id: "payment",
        kind: "payment",
        label: "Payment",
        resolution: "hypothesis",
        resourceKinds: ["payment"],
        actions: [
          composeExecutionNodeAction({
            id: "payment-settle",
            kind: "pay",
            label: "결제",
            executorHint: "finance",
          }),
        ],
        assignedExecutor: "finance",
      },
      {
        id: "complete",
        kind: "complete",
        label: "Complete",
        resolution: "hypothesis",
        resourceKinds: [],
        actions: [],
        assignedExecutor: "trade",
      },
    ],
    edges: [
      { fromNodeId: "listing", toNodeId: "negotiation" },
      { fromNodeId: "negotiation", toNodeId: "meeting" },
      { fromNodeId: "meeting", toNodeId: "payment" },
      { fromNodeId: "payment", toNodeId: "complete" },
    ],
  });
}

export function composeTradeSpatialTargets(): SpatialTargets {
  return composeSpatialTargets({
    byNodeId: {
      listing: composePhysicalSpatialTarget({ label: "집", resolution: "confirmed" }),
      negotiation: composeDigitalSpatialTarget(),
      meeting: composePhysicalSpatialTarget({ label: "카페", resolution: "hypothesis" }),
      payment: composeDigitalSpatialTarget(),
    },
  });
}

export function composeTradeBlueprint(input: {
  contextId: string;
  bridgeId?: string;
  runtimeId?: string;
  goal?: string;
}): ContextBlueprint {
  return composeContextBlueprint({
    containerKind: "trade",
    contextId: input.contextId,
    bridgeId: input.bridgeId,
    runtimeId: input.runtimeId,
    goal: input.goal ?? "중고 거래",
    executionGraph: composeTradeExecutionGraph(),
    spatialTargets: composeTradeSpatialTargets(),
    resourcePlan: {
      requiredResources: ["inventory", "payment", "people"],
      knownTruth: [],
      emptySlots: ["listing_title", "price"],
      nextQuestion: {
        slotId: "listing_title",
        promptKo: "어떤 물건을 판매할까요?",
      },
    },
    assignedExecutors: ["trade", "finance"],
    approvalPolicy: "manual",
  });
}

/** Medical vertical — Prepare → Visit → Treatment */
export function composeMedicalExecutionGraph(): ExecutionGraph {
  return composeExecutionGraph({
    nodes: [
      {
        id: "prepare",
        kind: "prepare",
        label: "Prepare",
        resolution: "confirmed",
        resourceKinds: ["documents"],
        actions: [
          composeExecutionNodeAction({
            id: "medical-intake",
            kind: "questionnaire",
            label: "문진표",
            executorHint: "medical",
          }),
        ],
        assignedExecutor: "medical",
      },
      {
        id: "visit",
        kind: "visit",
        label: "Visit",
        resolution: "hypothesis",
        resourceKinds: ["appointment"],
        actions: [
          composeExecutionNodeAction({
            id: "visit-checkin",
            kind: "check_in",
            label: "내원",
            executorHint: "medical",
          }),
        ],
        assignedExecutor: "medical",
      },
      {
        id: "treatment",
        kind: "treatment",
        label: "Treatment",
        resolution: "hypothesis",
        resourceKinds: ["documents", "payment"],
        actions: [
          composeExecutionNodeAction({
            id: "treatment-rx",
            kind: "pickup",
            label: "약국",
            executorHint: "medical",
          }),
        ],
        assignedExecutor: "medical",
      },
    ],
    edges: [
      { fromNodeId: "prepare", toNodeId: "visit" },
      { fromNodeId: "visit", toNodeId: "treatment" },
    ],
  });
}

export function composeMedicalSpatialTargets(): SpatialTargets {
  return composeSpatialTargets({
    byNodeId: {
      prepare: composePhysicalSpatialTarget({ label: "집", resolution: "confirmed" }),
      visit: composePhysicalSpatialTarget({ label: "병원", resolution: "hypothesis" }),
      treatment: composePhysicalSpatialTarget({ label: "약국", resolution: "hypothesis" }),
    },
  });
}
