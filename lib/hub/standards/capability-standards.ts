/**
 * Rimvio Capability Producer / Reviewer Standard — content SSOT v1.0.
 * Aligns with ADR-063 (spec), ADR-061 (certification), ADR-066 (reuse gate).
 */

import type {
  CapabilityContractField,
  CertificationLevel,
  CertificationLevelSpec,
  ChecklistItem,
  EvaluationCriterion,
  EvaluationScoreDimension,
  GuideSection,
  ProducerReuseFlowStep,
  SideEffectClass,
  StandardDefinition,
} from "@/lib/hub/standards/types";
import {
  ONTOLOGY_PRODUCER_GUIDE,
  VIEW_PRODUCER_GUIDE,
  WDK_OVERVIEW_STANDARD,
} from "@/lib/workspace-engine/standards/wdk-standards";

export const RIMVIO_CAPABILITY_STANDARD_VERSION = "1.0.0";
export const RIMVIO_STANDARD_EFFECTIVE_DATE = "2026-08-30";

/** Main Agent + Hub reuse policy — importable by agent-os / rimvio-index. */
export const MAIN_AGENT_CAPABILITY_POLICY = {
  version: RIMVIO_CAPABILITY_STANDARD_VERSION,
  priorityOrder: ["reuse", "improve", "create"] as const,
  rulesKo: [
    "기존 Capability를 우선 사용한다.",
    "유사 Capability가 있으면 REUSE 또는 IMPROVE를 선택한다.",
    "CREATE는 기존 Capability로 Goal을 충족할 수 없을 때만 선택한다.",
    "UNVERIFIED Capability는 Main Agent 실행에 사용하지 않는다.",
    "검수 PASS는 다음 단계 자격이지 Production 배포 권한이 아니다.",
    "VERIFIED는 Staging/Canary 자격이며, TRUSTED만 전면 Production이다.",
    "UNVERIFIED Capability는 TRUSTED Capability를 호출하지 못한다.",
    "Main Agent는 Capability ID만 알고, 소스·GitHub Token은 Runtime이 관리한다.",
    "WRITE · TRANSACTION · DESTRUCTIVE Side Effect는 사용자 승인 없이 자동 실행하지 않는다.",
  ],
  minTrustForMainAgent: "VERIFIED" as const,
  minTrustForAutoExecuteRead: "TESTED" as const,
} as const;

export const SIDE_EFFECT_CLASS_EXAMPLES: readonly {
  readonly capabilityId: string;
  readonly sideEffectClass: SideEffectClass;
  readonly noteKo: string;
}[] = [
  { capabilityId: "hotel.search", sideEffectClass: "READ", noteKo: "외부 상태 변경 없음" },
  { capabilityId: "cart.add", sideEffectClass: "WRITE", noteKo: "장바구니 상태 변경" },
  { capabilityId: "hotel.booking", sideEffectClass: "TRANSACTION", noteKo: "결제·예약 트랜잭션" },
  { capabilityId: "delete_account", sideEffectClass: "DESTRUCTIVE", noteKo: "되돌리기 어려운 삭제" },
];

export const CAPABILITY_CONTRACT_FIELDS: readonly CapabilityContractField[] = [
  { field: "id", descriptionKo: "Registry 고유 식별자", required: true },
  { field: "name", descriptionKo: "사람이 읽을 수 있는 이름", required: true },
  { field: "description", descriptionKo: "Capability 목적 요약", required: true },
  { field: "inputSchema", descriptionKo: "입력 JSON Schema (ADR-063 Input pillar)", required: true },
  { field: "outputSchema", descriptionKo: "출력 JSON Schema (ADR-063 Output pillar)", required: true },
  { field: "permissions", descriptionKo: "필요 권한 · context scope", required: true },
  { field: "sideEffects", descriptionKo: "READ / WRITE / TRANSACTION / DESTRUCTIVE", required: true },
  { field: "dependencies", descriptionKo: "다른 Capability · Provider 의존성", required: false },
  { field: "version", descriptionKo: "Semver — schema bump 규칙 준수", required: true },
  { field: "verificationStatus", descriptionKo: "Certification level", required: true },
  { field: "creator", descriptionKo: "Producer / platform owner", required: true },
  { field: "createdAt", descriptionKo: "최초 등록 시각", required: true },
  { field: "updatedAt", descriptionKo: "마지막 수정 시각", required: true },
];

export const PRODUCER_SUBMIT_CHECKLIST: readonly ChecklistItem[] = [
  { id: "purpose", labelKo: "Capability의 목적이 명확한가?", required: true },
  { id: "input_schema", labelKo: "Input Schema가 명확한가?", required: true },
  { id: "output_schema", labelKo: "Output Schema가 명확한가?", required: true },
  { id: "failure_states", labelKo: "실패 상태가 정의되어 있는가?", required: true },
  { id: "dependencies", labelKo: "외부 API/서비스 의존성이 정의되어 있는가?", required: true },
  { id: "permissions", labelKo: "필요한 권한이 정의되어 있는가?", required: true },
  { id: "side_effects", labelKo: "Side Effect가 정의되어 있는가?", required: true },
  { id: "no_duplicate", labelKo: "다른 Capability와 중복되지 않는가?", required: true },
  { id: "searched_existing", labelKo: "기존 Capability를 먼저 검색했는가?", required: true },
  { id: "reuse_first", labelKo: "기존 Capability 재사용·개선이 더 적절하지 않은가?", required: true },
  { id: "auto_tests", labelKo: "자동 테스트가 존재하는가?", required: true },
  { id: "edge_cases", labelKo: "대표적인 Edge Case를 테스트했는가?", required: false },
];

export const PRODUCER_REUSE_FLOW: readonly ProducerReuseFlowStep[] = [
  { id: "idea", labelKo: "Idea" },
  { id: "search", labelKo: "기존 Capability 검색", nextOnYes: "similar", nextOnNo: "create" },
  { id: "similar", labelKo: "유사 Capability 존재?" },
  { id: "reuse", labelKo: "REUSE 또는 IMPROVE", nextOnNo: "create" },
  { id: "create", labelKo: "CREATE — 신규 제출" },
];

export const REVIEWER_EVALUATION_CRITERIA: readonly EvaluationCriterion[] = [
  { id: "input_contract", titleKo: "Input Contract", descriptionKo: "입력 스키마·필수 슬롯 준수", automated: true },
  { id: "output_contract", titleKo: "Output Contract", descriptionKo: "출력 스키마·타입 일치", automated: true },
  { id: "semantic", titleKo: "Semantic Accuracy", descriptionKo: "사용자 의도와 결과 의미 일치", automated: false },
  { id: "data_accuracy", titleKo: "Data Accuracy", descriptionKo: "실제 세계 정보와 일치", automated: false },
  { id: "completeness", titleKo: "Completeness", descriptionKo: "필수 정보 누락 없음", automated: false },
  { id: "goal_success", titleKo: "Goal Success", descriptionKo: "Tool 성공 ≠ Goal 성공 — 목표 달성 여부", automated: false },
  { id: "error_handling", titleKo: "Error Handling", descriptionKo: "실패·엣지 케이스 처리", automated: true },
  { id: "safety", titleKo: "Safety", descriptionKo: "권한·Side Effect·외부 행동 적절성", automated: true },
  { id: "performance", titleKo: "Performance", descriptionKo: "지연·타임아웃·비용", automated: true },
  { id: "reusability", titleKo: "Reusability", descriptionKo: "다른 Workflow에서 재사용 가능", automated: false },
];

export const REVIEWER_SCORE_DIMENSIONS: readonly EvaluationScoreDimension[] = [
  { id: "accuracy", labelKo: "Accuracy", min: 1, max: 5 },
  { id: "relevance", labelKo: "Relevance", min: 1, max: 5 },
  { id: "completeness", labelKo: "Completeness", min: 1, max: 5 },
  { id: "goal_success", labelKo: "GoalSuccess", min: 1, max: 5 },
  { id: "reliability", labelKo: "Reliability", min: 1, max: 5 },
  { id: "safety", labelKo: "Safety", min: 1, max: 5 },
  { id: "reusability", labelKo: "Reusability", min: 1, max: 5 },
];

export const REVIEWER_CHECKLIST: readonly ChecklistItem[] = [
  { id: "intent", labelKo: "사용자의 의도를 정확하게 처리했는가?", required: true },
  { id: "input", labelKo: "Input 조건을 준수했는가?", required: true },
  { id: "output", labelKo: "Output Schema를 준수했는가?", required: true },
  { id: "factual", labelKo: "결과가 실제 정보와 일치하는가?", required: true },
  { id: "complete", labelKo: "중요한 정보가 누락되지 않았는가?", required: true },
  { id: "matching", labelKo: "동일 상품/객체를 잘못 매칭하지 않았는가?", required: true },
  { id: "failures", labelKo: "실패 상황을 적절하게 처리했는가?", required: true },
  { id: "side_effects", labelKo: "권한 및 Side Effect가 적절한가?", required: true },
  { id: "no_extra", labelKo: "불필요한 외부 행동을 수행하지 않았는가?", required: true },
  { id: "reusable", labelKo: "다른 Capability에서 재사용 가능한가?", required: false },
];

export const CERTIFICATION_LEVELS: readonly CertificationLevelSpec[] = [
  {
    level: "UNVERIFIED",
    titleKo: "미검증",
    descriptionKo: "새로 제출되었지만 아직 충분한 검증을 거치지 않은 상태. Main Agent 실행에 사용하지 않음.",
  },
  {
    level: "TESTED",
    titleKo: "테스트 통과",
    descriptionKo: "Sandbox · 기본 Contract · 자동 테스트를 통과. 제한적 환경에서만 사용.",
  },
  {
    level: "VERIFIED",
    titleKo: "검증됨",
    descriptionKo: "Human Review와 Benchmark를 통과. Staging 자격 — 전면 Production이 아님.",
  },
  {
    level: "TRUSTED",
    titleKo: "신뢰",
    descriptionKo: "Staging · Canary telemetry가 안정된 뒤에만 전면 Production.",
  },
];

const AUTOMATED_VALIDATION_BULLETS = [
  "Schema · Type · Contract",
  "Dependency · Security",
  "Basic Tests · Performance",
] as const;

const HUMAN_REVIEW_BULLETS = [
  "Semantic Quality · Goal Success",
  "Data Accuracy · Completeness",
  "Real-world Usefulness",
] as const;

export const CAPABILITY_STANDARD: StandardDefinition = {
  id: "capability_standard",
  version: RIMVIO_CAPABILITY_STANDARD_VERSION,
  role: "shared",
  titleKo: "Rimvio Capability Standard",
  summaryKo:
    "Capability는 Rimvio Agent가 실제 사용자 Goal을 수행하기 위해 재사용할 수 있는 독립적인 능력 단위입니다.",
  effectiveDateIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  updatedAtIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  changelogKo: ["v1.0 — Producer/Reviewer Standard System 초기 정의"],
  sections: [
    {
      id: "qualities",
      titleKo: "좋은 Capability",
      descriptionKo: "명확한 목적 · 입출력 · 조합 가능 · 검증 가능 · 실패 표현 · 권한 명시 · 중복 최소화",
      bullets: [
        "명확한 목적을 가진다",
        "입력과 출력이 명확하다",
        "다른 Capability와 조합 가능하다",
        "검증 가능하다",
        "실패를 명확하게 표현한다",
        "필요한 권한을 명시한다",
        "중복 Capability 생성을 최소화한다",
      ],
    },
    {
      id: "validation_split",
      titleKo: "자동 검증 vs Human Review",
      descriptionKo: "기계가 검증하기 좋은 것은 자동화하고, 사람이 판단해야 하는 것은 Human Review로 남긴다.",
      bullets: [...AUTOMATED_VALIDATION_BULLETS, "---", ...HUMAN_REVIEW_BULLETS],
    },
    {
      id: "metrics",
      titleKo: "Execution Evidence",
      descriptionKo: "Tool Success · Capability Success · Workflow Success · Goal Success를 분리 측정합니다.",
      bullets: [
        "Capability Reuse Rate — 새 요청을 기존 Capability로 해결하는 비율",
        "Goal Success — Tool은 성공했지만 사용자 목표는 실패할 수 있음",
      ],
    },
  ],
};

export const PRODUCER_GUIDE: StandardDefinition = {
  id: "producer_guide",
  version: RIMVIO_CAPABILITY_STANDARD_VERSION,
  role: "producer",
  titleKo: "Producer Guide",
  summaryKo: "Capability를 제작·수정하는 Producer가 따라야 할 Rimvio 작업 표준입니다.",
  effectiveDateIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  updatedAtIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  sections: [
    {
      id: "small_clear",
      titleKo: "Capability는 작고 명확해야 한다",
      descriptionKo: "하나의 Capability는 하나의 명확한 능력을 가져야 합니다.",
      rules: [
        {
          id: "single_purpose",
          titleKo: "하나의 능력 = 하나의 Capability",
          whyKo: "재사용성과 Workflow Blueprint slot 조합 가능성을 높입니다.",
          examples: [
            { kind: "good", items: ["Product Search", "Hotel Search", "Price Comparison", "Hotel Image Verification"] },
            { kind: "bad", items: ["Everything Shopping AI", "Travel Super Agent", "Do Everything"] },
          ],
          checklist: [{ id: "one_purpose", labelKo: "목적이 하나인가?" }],
        },
      ],
    },
    {
      id: "reuse_before_create",
      titleKo: "중복 Capability 방지",
      descriptionKo: "새로운 Capability를 만들기 전에 반드시 기존 Capability를 검색합니다.",
      bullets: PRODUCER_REUSE_FLOW.map((s) => s.labelKo),
    },
    {
      id: "submit_checklist",
      titleKo: "제출 전 Checklist",
      checklist: PRODUCER_SUBMIT_CHECKLIST,
    },
  ],
};

export const REVIEWER_GUIDE: StandardDefinition = {
  id: "reviewer_guide",
  version: RIMVIO_CAPABILITY_STANDARD_VERSION,
  role: "reviewer",
  titleKo: "Reviewer Guide",
  summaryKo: "Capability 품질·정확성·안전성·계약 준수를 검수하는 Reviewer 작업 표준입니다.",
  effectiveDateIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  updatedAtIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  sections: [
    {
      id: "evaluation_flow",
      titleKo: "평가 흐름",
      descriptionKo: "Capability → Test Scenario → Execution Result → Evaluation → Evidence → Score → Decision",
      bullets: ["PASS", "FAIL", "NEEDS_IMPROVEMENT"],
    },
    {
      id: "criteria",
      titleKo: "평가 기준",
      descriptionKo: "단순 좋다/나쁘다가 아닌 10개 축으로 평가합니다.",
      bullets: REVIEWER_EVALUATION_CRITERIA.map((c) => `${c.titleKo} — ${c.descriptionKo}`),
    },
    {
      id: "comparison",
      titleKo: "Capability 비교 평가",
      descriptionKo: "동일 Family의 여러 Capability에 같은 Test Scenario를 실행해 A > B · Equivalent · Both Fail 등 Preference를 기록합니다.",
      bullets: ["향후 Capability Ranking에 연결 — 이번 MVP에서는 구조만 준비"],
    },
    {
      id: "review_checklist",
      titleKo: "Evaluation Checklist",
      checklist: REVIEWER_CHECKLIST,
    },
  ],
};

export const CONTRACT_STANDARD: StandardDefinition = {
  id: "contract_standard",
  version: RIMVIO_CAPABILITY_STANDARD_VERSION,
  role: "shared",
  titleKo: "Capability Contract Standard",
  summaryKo: "ADR-063 RimvioCapabilitySpecification · CapabilityIndexEntry 필드를 기준으로 합니다.",
  effectiveDateIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  updatedAtIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  sections: [
    {
      id: "fields",
      titleKo: "필수 Contract 필드",
      bullets: CAPABILITY_CONTRACT_FIELDS.map(
        (f) => `${f.field}${f.required ? " *" : ""} — ${f.descriptionKo}`,
      ),
    },
    {
      id: "side_effects",
      titleKo: "Side Effect Standard",
      descriptionKo: "외부 상태 변경 위험도를 Capability에 명시합니다.",
      bullets: SIDE_EFFECT_CLASS_EXAMPLES.map(
        (e) => `${e.capabilityId} → ${e.sideEffectClass} (${e.noteKo})`,
      ),
    },
  ],
};

export const CERTIFICATION_STANDARD: StandardDefinition = {
  id: "certification_standard",
  version: RIMVIO_CAPABILITY_STANDARD_VERSION,
  role: "shared",
  titleKo: "Certification Level",
  summaryKo: "Main Agent는 VERIFIED 이상 Capability만 Goal 실행에 사용합니다.",
  effectiveDateIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  updatedAtIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  sections: [
    {
      id: "levels",
      titleKo: "신뢰 단계",
      bullets: CERTIFICATION_LEVELS.map((l) => `${l.level} — ${l.titleKo}: ${l.descriptionKo}`),
    },
  ],
};

export const MAIN_AGENT_POLICY_STANDARD: StandardDefinition = {
  id: "main_agent_policy",
  version: RIMVIO_CAPABILITY_STANDARD_VERSION,
  role: "shared",
  titleKo: "Main Agent Policy",
  summaryKo: "LLM은 자유롭게 Reasoning하지만 Execute는 검증된 Capability + Policy 안에서만 수행합니다.",
  effectiveDateIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  updatedAtIso: RIMVIO_STANDARD_EFFECTIVE_DATE,
  sections: [
    {
      id: "policy",
      titleKo: "Reuse Before Create",
      bullets: [...MAIN_AGENT_CAPABILITY_POLICY.rulesKo],
    },
  ],
};

export const ALL_STANDARDS: readonly StandardDefinition[] = [
  CAPABILITY_STANDARD,
  PRODUCER_GUIDE,
  REVIEWER_GUIDE,
  CONTRACT_STANDARD,
  CERTIFICATION_STANDARD,
  MAIN_AGENT_POLICY_STANDARD,
  WDK_OVERVIEW_STANDARD,
  VIEW_PRODUCER_GUIDE,
  ONTOLOGY_PRODUCER_GUIDE,
];

export type HubStandardsView =
  | "overview"
  | "capability_standard"
  | "producer_guide"
  | "reviewer_guide"
  | "contract_standard"
  | "certification_standard"
  | "main_agent_policy"
  | "wdk_overview"
  | "view_producer_guide"
  | "ontology_producer_guide"
  | "trust_pipeline";

export const HUB_STANDARDS_NAV: readonly { id: HubStandardsView; labelKo: string }[] = [
  { id: "overview", labelKo: "개요" },
  { id: "wdk_overview", labelKo: "Workspace Dev Kit" },
  { id: "capability_standard", labelKo: "Capability Standards" },
  { id: "producer_guide", labelKo: "Capability Producer" },
  { id: "view_producer_guide", labelKo: "View Producer" },
  { id: "ontology_producer_guide", labelKo: "Ontology Producer" },
  { id: "reviewer_guide", labelKo: "Reviewer Guide" },
  { id: "contract_standard", labelKo: "Contract" },
  { id: "certification_standard", labelKo: "Certification" },
  { id: "trust_pipeline", labelKo: "Trust Pipeline" },
  { id: "main_agent_policy", labelKo: "Main Agent Policy" },
];

export function resolveStandardById(id: HubStandardsView): StandardDefinition | null {
  if (id === "overview") return null;
  return ALL_STANDARDS.find((s) => s.id === id) ?? null;
}

export function searchStandards(query: string): readonly StandardDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_STANDARDS;
  return ALL_STANDARDS.filter((std) => {
    const hay = [
      std.titleKo,
      std.summaryKo,
      ...std.sections.flatMap((s) => [
        s.titleKo,
        s.descriptionKo ?? "",
        ...(s.bullets ?? []),
        ...(s.checklist?.map((c) => c.labelKo) ?? []),
        ...(s.rules?.flatMap((r) => [r.titleKo, r.whyKo]) ?? []),
      ]),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

/** Map granular protocol side effects → 4-class standard for Producer UI. */
export function inferSideEffectClass(capabilityId: string, riskTier?: string): SideEffectClass {
  const id = capabilityId.toLowerCase();
  if (id.includes("delete") || id.includes("remove_account") || riskTier === "critical") {
    return "DESTRUCTIVE";
  }
  if (
    id.includes("book") ||
    id.includes("payment") ||
    id.includes("commit") ||
    id.includes("purchase") ||
    id.includes("charge")
  ) {
    return "TRANSACTION";
  }
  if (
    id.includes("create") ||
    id.includes("update") ||
    id.includes("write") ||
    id.includes("add") ||
    id.includes("cart")
  ) {
    return "WRITE";
  }
  return "READ";
}

/** Map platform lifecycle → certification level for display. */
export function lifecycleToCertificationLevel(
  status: string | undefined,
  rimvioCertified?: boolean,
): CertificationLevel {
  if (rimvioCertified && status === "PUBLISHED") return "TRUSTED";
  if (status === "PUBLISHED") return "VERIFIED";
  if (status === "TESTING") return "TESTED";
  if (status === "VALIDATING") return "TESTED";
  return "UNVERIFIED";
}
