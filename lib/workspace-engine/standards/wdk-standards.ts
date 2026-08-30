/**
 * Workspace Developer Kit — standards content for Hub Producer/Reviewer UI.
 */

import type { StandardDefinition } from "@/lib/hub/standards/types";
import { WORKSPACE_LAYER_SPECS } from "@/lib/workspace-engine/layers";
import { RIMVIO_PRODUCER_KIND_SPECS } from "@/lib/workspace-engine/producer-kind";
import { MAP_VIEW_CONTRACT } from "@/lib/workspace-engine/view-contracts/map-view-contract";
import { WORKSPACE_EXTENSION_PIPELINE } from "@/lib/workspace-engine/extension/submission";

const WDK_STANDARD_VERSION = "1.0.0";
const WDK_STANDARD_EFFECTIVE_DATE = "2026-08-30";

export const WDK_OVERVIEW_STANDARD: StandardDefinition = {
  id: "wdk_overview",
  version: WDK_STANDARD_VERSION,
  role: "shared",
  titleKo: "Workspace Developer Kit",
  summaryKo:
    "Rimvio Contract를 준수하는 Extension 개발. 자유로운 React 앱이 아니라 Object · View · Relation · Action · Event Primitive 조합.",
  effectiveDateIso: WDK_STANDARD_EFFECTIVE_DATE,
  updatedAtIso: WDK_STANDARD_EFFECTIVE_DATE,
  sections: [
    {
      id: "three_layers",
      titleKo: "Workspace 3층",
      descriptionKo: "Data → Object → View. Map은 Capability가 아니라 View Layer.",
      bullets: Object.values(WORKSPACE_LAYER_SPECS).flatMap((l) => [
        `${l.titleKo}: ${l.descriptionKo}`,
        ...l.examplesKo.map((e) => `  · ${e}`),
      ]),
    },
    {
      id: "four_producers",
      titleKo: "4종 Producer",
      bullets: Object.values(RIMVIO_PRODUCER_KIND_SPECS).map(
        (p) => `${p.titleKo} — ${p.questionKo}`,
      ),
    },
    {
      id: "pipeline",
      titleKo: "Extension 검증 파이프라인",
      bullets: [...WORKSPACE_EXTENSION_PIPELINE],
    },
    {
      id: "stack",
      titleKo: "Rimvio Stack",
      descriptionKo: "Ontology → Objects → Capabilities → Workspace → Main Agent → User",
      bullets: [
        "Main Agent는 Tool 호출이 아니라 필요한 Workspace를 구성",
        "검증된 Blueprint + Verified Capability + View Contract만 사용",
      ],
    },
  ],
};

export const VIEW_PRODUCER_GUIDE: StandardDefinition = {
  id: "view_producer_guide",
  version: WDK_STANDARD_VERSION,
  role: "producer",
  titleKo: "View Producer Guide",
  summaryKo: "Map · Timeline · Table · Graph Extension — View Contract 구현.",
  effectiveDateIso: WDK_STANDARD_EFFECTIVE_DATE,
  updatedAtIso: WDK_STANDARD_EFFECTIVE_DATE,
  sections: [
    {
      id: "not_capability",
      titleKo: "View ≠ Capability",
      descriptionKo: "지도 기능을 Capability로 제출하지 않습니다. View Contract Extension으로 제출합니다.",
      bullets: ["Capability = 무엇을 할 수 있는가", "View = Object를 어떻게 보여주는가"],
    },
    {
      id: "map_contract",
      titleKo: "Map View Contract",
      descriptionKo: MAP_VIEW_CONTRACT.summaryKo,
      bullets: [
        `Input: ${MAP_VIEW_CONTRACT.consumesObjectType}`,
        ...MAP_VIEW_CONTRACT.objectRequirements.map(
          (f) => `${f.name}${f.required ? " *" : ""} (${f.type})`,
        ),
        `Events: ${MAP_VIEW_CONTRACT.events.map((e) => e.id).join(", ")}`,
        `Actions: ${MAP_VIEW_CONTRACT.actions.map((a) => a.id).join(", ")}`,
      ],
    },
    {
      id: "submit_flow",
      titleKo: "Create Workspace Extension",
      bullets: [
        "Type: Map | Timeline | Table | Graph",
        "Consumes: GeoObject[] 등",
        "Supports: select · focus · filter",
        "Permissions: read:location",
        "Test: 100 test objects",
        "Submit → Schema → Sandbox → Performance → Security → Human Review → Verified",
      ],
    },
    {
      id: "review_checklist",
      titleKo: "Reviewer Checklist",
      checklist: [
        { id: "contract", labelKo: "View Contract 필드·이벤트 준수?", required: true },
        { id: "perf", labelKo: "100+ Object 성능 테스트 통과?", required: true },
        { id: "security", labelKo: "권한 최소화?", required: true },
        { id: "no_ssot", labelKo: "View가 SSOT를 직접 변경하지 않는가?", required: true },
      ],
    },
  ],
};

export const ONTOLOGY_PRODUCER_GUIDE: StandardDefinition = {
  id: "ontology_producer_guide",
  version: WDK_STANDARD_VERSION,
  role: "producer",
  titleKo: "Ontology Producer Guide",
  summaryKo: "Domain Object 타입·Relation 등록 — UI가 아닌 의미 구조.",
  effectiveDateIso: WDK_STANDARD_EFFECTIVE_DATE,
  updatedAtIso: WDK_STANDARD_EFFECTIVE_DATE,
  sections: [
    {
      id: "meaning_not_ui",
      titleKo: "Ontology = 의미 구조",
      descriptionKo: "Trip → Destination → Hotel 트리는 사람이 매번 코드로 만들지 않습니다. Schema 등록.",
      bullets: ["Object Types", "Relations", "Domain namespace"],
    },
    {
      id: "new_domain",
      titleKo: "새 Domain 예: Property",
      bullets: [
        "Property · Building · Unit · Lease · Tenant",
        "LOCATED_IN · LISTED_BY · HAS_PRICE · NEAR",
      ],
    },
    {
      id: "review_checklist",
      titleKo: "Reviewer Checklist",
      checklist: [
        { id: "semantic", labelKo: "관계가 의미적으로 맞는가?", required: true },
        { id: "duplicate", labelKo: "객체 타입이 중복되지 않는가?", required: true },
        { id: "conflict", labelKo: "기존 Ontology와 충돌하지 않는가?", required: true },
        { id: "agent", labelKo: "Main Agent가 이해·조합할 수 있는가?", required: true },
      ],
    },
    {
      id: "connect_capability",
      titleKo: "Capability 연결",
      descriptionKo: "Ontology Hotel → Map View → hotel.search → hotel.ranking → booking",
      bullets: [
        "Ontology 확장 = Rimvio가 이해하는 세계 확장",
        "다른 Producer Capability가 동일 Object 위에서 동작",
      ],
    },
  ],
};
