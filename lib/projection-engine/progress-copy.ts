import type { ProjectionStage } from "@/lib/projection-engine/types";

/**
 * L1 progress — Projection Engine pipeline.
 * Globe copy may say 「투영」; never 「검색엔진」「AI Layer」 in hero.
 */
export const PROJECTION_STAGE_PROGRESS_KO: Readonly<
  Record<ProjectionStage, string>
> = {
  UNDERSTAND_INTENT: "요청의 진짜 의도를 파악하는 중…",
  GENERATE_PROJECT: "프로젝트를 만드는 중…",
  GENERATE_ONTOLOGY: "장소·일정·자원 노드를 연결하는 중…",
  GENERATE_RELATIONS: "관계망을 그리는 중…",
  SEARCH: "🔎 검색 중…",
  PROJECT_GLOBE: "🗺 Globe에 결과를 투영하는 중…",
  CLUSTER: "후보를 클러스터로 묶는 중…",
  SUGGEST_TASKS: "다음에 할 일을 정리하는 중…",
  WAIT_COMMIT: "📍 후보 위치를 표시했습니다. 반영은 승인이 필요해요.",
};

export const PROJECTION_STAGE_DONE_KO: Readonly<
  Record<ProjectionStage, string>
> = {
  UNDERSTAND_INTENT: "의도를 이해했습니다.",
  GENERATE_PROJECT: "프로젝트를 만들었습니다.",
  GENERATE_ONTOLOGY: "온톨로지 노드를 준비했습니다.",
  GENERATE_RELATIONS: "관계를 연결했습니다.",
  SEARCH: "후보를 모았습니다.",
  PROJECT_GLOBE: "Globe에 투영했습니다.",
  CLUSTER: "클러스터를 나눴습니다.",
  SUGGEST_TASKS: "할 일을 제안했습니다.",
  WAIT_COMMIT: "승인 후 현실에 반영할 수 있어요.",
};

export const PROJECTION_STAGE_TITLE_KO: Readonly<
  Record<ProjectionStage, string>
> = {
  UNDERSTAND_INTENT: "Intent",
  GENERATE_PROJECT: "Project",
  GENERATE_ONTOLOGY: "Ontology",
  GENERATE_RELATIONS: "Relations",
  SEARCH: "Search",
  PROJECT_GLOBE: "Globe Projection",
  CLUSTER: "Cluster",
  SUGGEST_TASKS: "Tasks",
  WAIT_COMMIT: "Commit Gate",
};

export function projectionStageProgressKo(stage: ProjectionStage): string {
  return PROJECTION_STAGE_PROGRESS_KO[stage];
}
