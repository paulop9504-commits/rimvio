/**
 * Rimvio Hub Agent — 100 Capability Registry (SSOT).
 *
 * Flow: NL → Platform understand → Plan → Explore → Mutate → Execute
 *       → Verify → Self-repair → Preview → Approve → Publish
 *
 * Platform Reasoning (31–50) + Coding Agent (51–60) = Rimvio differentiation.
 * Not a Cursor clone; not a CRUD builder only.
 */

export type AgentCapabilityPhase = 1 | 2 | 3 | 4 | 5;

export type AgentCapabilityStatus =
  | "implemented"
  | "partial"
  | "planned"
  | "frozen";

export type AgentCapabilityCategory =
  | "conversation_intent"
  | "platform_understanding"
  | "context_code_discovery"
  | "platform_planning"
  | "platform_mutation"
  | "coding_agent"
  | "build_test_debug"
  | "self_repair_loop"
  | "runtime_preview_browser"
  | "change_safety_publish";

export type RimvioAgentCapability = {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly roleKo: string;
  readonly category: AgentCapabilityCategory;
  readonly phase: AgentCapabilityPhase;
  readonly status: AgentCapabilityStatus;
  /** Existing code touchpoints — extend here, do not fork parallel systems */
  readonly modules: readonly string[];
};

export const RIMVIO_AGENT_FLOW = [
  "intent",
  "goal",
  "platform_reasoning",
  "context_discovery",
  "plan",
  "mutate",
  "execute",
  "verify",
  "self_repair",
  "preview",
  "review",
  "publish",
] as const;

export const RIMVIO_AGENT_CAPABILITIES: readonly RimvioAgentCapability[] = [
  // A. Conversation & Intent — 1~10
  { id: 1, slug: "intent_understanding", name: "Intent Understanding", roleKo: "사용자가 무엇을 원하는지 판단", category: "conversation_intent", phase: 1, status: "implemented", modules: ["lib/agent/capabilities/intent-understand/", "lib/agent/conversation/classify-intent.ts"] },
  { id: 2, slug: "goal_extraction", name: "Goal Extraction", roleKo: "최종 목표 추출", category: "conversation_intent", phase: 1, status: "implemented", modules: ["lib/hub/dev/platform-agent/platform-goal.ts", "lib/hub/dev/platform-agent/goal-extraction.ts", "lib/agent/conversation/goal-resolution.ts"] },
  { id: 3, slug: "conversation_vs_action", name: "Conversation vs Action", roleKo: "ㅎㅇ와 플랫폼 만들어줘 구분", category: "conversation_intent", phase: 1, status: "implemented", modules: ["lib/agent/conversation/conversation-gate.ts", "lib/hub/dev/hub-agent-controller.ts"] },
  { id: 4, slug: "context_persistence", name: "Context Persistence", roleKo: "이전 대화와 현재 작업 연결", category: "conversation_intent", phase: 1, status: "partial", modules: ["lib/agent/conversation/intent-types.ts"] },
  { id: 5, slug: "reference_resolution", name: "Reference Resolution", roleKo: "그거/이 기능/여기 해석", category: "conversation_intent", phase: 1, status: "planned", modules: [] },
  { id: 6, slug: "constraint_extraction", name: "Constraint Extraction", roleKo: "조건/제약 추출", category: "conversation_intent", phase: 1, status: "partial", modules: ["lib/hub/dev/platform-agent/platform-goal.ts"] },
  { id: 7, slug: "requirement_clarification", name: "Requirement Clarification", roleKo: "부족한 요구사항 질문", category: "conversation_intent", phase: 1, status: "implemented", modules: ["lib/agent/conversation/conversation-gate.ts"] },
  { id: 8, slug: "implicit_intent", name: "Implicit Intent Detection", roleKo: "직접 말하지 않은 의도 추론", category: "conversation_intent", phase: 1, status: "planned", modules: [] },
  { id: 9, slug: "goal_change_detection", name: "Goal Change Detection", roleKo: "작업 중 새 목표 감지", category: "conversation_intent", phase: 1, status: "planned", modules: [] },
  { id: 10, slug: "conversation_memory", name: "Conversation Memory", roleKo: "작업 맥락 지속", category: "conversation_intent", phase: 1, status: "partial", modules: ["lib/agent/events/agent-event-types.ts"] },

  // B. Platform Understanding — 11~20
  { id: 11, slug: "platform_discovery", name: "Platform Discovery", roleKo: "현재 Platform 구조 파악", category: "platform_understanding", phase: 1, status: "implemented", modules: ["lib/hub/dev/hub-workspace-observe.ts", "lib/agent/hub-observation/workspace-observer.ts"] },
  { id: 12, slug: "platform_state", name: "Platform State Understanding", roleKo: "현재 상태 이해", category: "platform_understanding", phase: 1, status: "implemented", modules: ["lib/hub/dev/dev-project-state.ts"] },
  { id: 13, slug: "capability_discovery", name: "Capability Discovery", roleKo: "Capability 탐색", category: "platform_understanding", phase: 1, status: "implemented", modules: ["lib/hub/dev/platform-agent/context-discovery.ts", "hub-workspace-tools:capability.list"] },
  { id: 14, slug: "workflow_discovery", name: "Workflow Discovery", roleKo: "Workflow 탐색", category: "platform_understanding", phase: 1, status: "partial", modules: ["lib/hub/dev/workflow-graph.ts", "hub-workspace-tools:workflow.read"] },
  { id: 15, slug: "schema_discovery", name: "Schema Discovery", roleKo: "Schema 탐색", category: "platform_understanding", phase: 1, status: "partial", modules: ["hub-workspace-tools:schema.read"] },
  { id: 16, slug: "permission_discovery", name: "Permission Discovery", roleKo: "Permission 탐색", category: "platform_understanding", phase: 1, status: "partial", modules: ["hub-workspace-tools:permission.read"] },
  { id: 17, slug: "connection_discovery", name: "Connection Discovery", roleKo: "외부 서비스 연결 상태", category: "platform_understanding", phase: 1, status: "implemented", modules: ["lib/integrations/hub-platform/connection-manager.ts"] },
  { id: 18, slug: "ui_structure_discovery", name: "UI Structure Discovery", roleKo: "UI 구조 이해", category: "platform_understanding", phase: 1, status: "partial", modules: ["lib/hub/dev/platform-agent/platform-source-map.ts"] },
  { id: 19, slug: "runtime_state_discovery", name: "Runtime State Discovery", roleKo: "실행 상태 이해", category: "platform_understanding", phase: 1, status: "partial", modules: ["lib/hub/dev/sandbox-preview.ts"] },
  { id: 20, slug: "platform_dependency_graph", name: "Platform Dependency Graph", roleKo: "Platform 의존관계", category: "platform_understanding", phase: 1, status: "partial", modules: ["lib/hub/dev/platform-agent/context-discovery.ts"] },

  // C. Context / Code Discovery — 21~30
  { id: 21, slug: "file_tree_exploration", name: "File Tree Exploration", roleKo: "파일 구조 탐색", category: "context_code_discovery", phase: 1, status: "partial", modules: ["lib/hub/dev/hub-file-tree.ts", "hub-workspace-tools:code.listFiles"] },
  { id: 22, slug: "file_search", name: "File Search", roleKo: "파일 찾기", category: "context_code_discovery", phase: 1, status: "partial", modules: ["hub-workspace-tools:code.searchFiles", "hub-workspace-tools:workspace.search"] },
  { id: 23, slug: "content_search", name: "Content Search", roleKo: "코드 내용 검색", category: "context_code_discovery", phase: 1, status: "partial", modules: ["lib/hub/dev/coding-agent/coding-sandbox.ts"] },
  { id: 24, slug: "symbol_search", name: "Symbol Search", roleKo: "함수/클래스 찾기", category: "context_code_discovery", phase: 1, status: "partial", modules: ["hub-workspace-tools:code.searchSymbol"] },
  { id: 25, slug: "definition_search", name: "Definition Search", roleKo: "정의 찾기", category: "context_code_discovery", phase: 1, status: "planned", modules: [] },
  { id: 26, slug: "reference_search", name: "Reference Search", roleKo: "사용처 찾기", category: "context_code_discovery", phase: 1, status: "partial", modules: ["hub-workspace-tools:code.findReferences"] },
  { id: 27, slug: "import_analysis", name: "Import Analysis", roleKo: "import 관계 분석", category: "context_code_discovery", phase: 1, status: "planned", modules: [] },
  { id: 28, slug: "call_graph_analysis", name: "Call Graph Analysis", roleKo: "호출 관계 분석", category: "context_code_discovery", phase: 1, status: "planned", modules: [] },
  { id: 29, slug: "relevant_context_selection", name: "Relevant Context Selection", roleKo: "필요한 코드만 선택", category: "context_code_discovery", phase: 1, status: "implemented", modules: ["lib/hub/dev/platform-agent/context-discovery.ts", "lib/hub/dev/platform-agent/relevant-context.ts"] },
  { id: 30, slug: "cross_file_reasoning", name: "Cross-file Reasoning", roleKo: "여러 파일 연결 이해", category: "context_code_discovery", phase: 1, status: "planned", modules: [] },

  // D. Platform Planning — 31~40
  { id: 31, slug: "task_decomposition", name: "Task Decomposition", roleKo: "큰 작업 분해", category: "platform_planning", phase: 1, status: "implemented", modules: ["lib/hub/dev/platform-agent/task-decomposition.ts", "lib/hub/dev/hub-agent-planner.ts"] },
  { id: 32, slug: "platform_planning", name: "Platform Planning", roleKo: "Platform 변경 계획", category: "platform_planning", phase: 1, status: "partial", modules: ["lib/hub/dev/platform-agent/platform-planner.ts"] },
  { id: 33, slug: "capability_planning", name: "Capability Planning", roleKo: "Capability 변경 계획", category: "platform_planning", phase: 1, status: "partial", modules: ["lib/hub/dev/platform-agent/platform-planner.ts"] },
  { id: 34, slug: "workflow_planning", name: "Workflow Planning", roleKo: "Workflow 변경 계획", category: "platform_planning", phase: 1, status: "partial", modules: ["lib/hub/dev/platform-agent/platform-planner.ts"] },
  { id: 35, slug: "schema_planning", name: "Schema Planning", roleKo: "Schema 변경 계획", category: "platform_planning", phase: 1, status: "partial", modules: ["lib/hub/dev/platform-agent/platform-planner.ts"] },
  { id: 36, slug: "ui_planning", name: "UI Planning", roleKo: "UI 변경 계획", category: "platform_planning", phase: 1, status: "planned", modules: [] },
  { id: 37, slug: "permission_planning", name: "Permission Planning", roleKo: "권한 변경 계획", category: "platform_planning", phase: 1, status: "planned", modules: [] },
  { id: 38, slug: "connection_planning", name: "Connection Planning", roleKo: "연결 계획", category: "platform_planning", phase: 1, status: "partial", modules: ["lib/hub/dev/platform-agent/platform-planner.ts"] },
  { id: 39, slug: "implementation_planning", name: "Implementation Planning", roleKo: "코드 구현 계획", category: "platform_planning", phase: 1, status: "partial", modules: ["lib/hub/dev/platform-agent/coding-plan.ts"] },
  { id: 40, slug: "execution_ordering", name: "Execution Ordering", roleKo: "작업 순서 최적화", category: "platform_planning", phase: 1, status: "partial", modules: ["lib/hub/dev/hub-agent-planner.ts"] },

  // E. Platform Creation / Mutation — 41~50
  { id: 41, slug: "platform_creation", name: "Platform Creation", roleKo: "새 Platform 생성", category: "platform_mutation", phase: 2, status: "implemented", modules: ["lib/hub/dev/platform-agent/platform-planner.ts", "lib/hub/dev/platform-analyzer.ts"] },
  { id: 42, slug: "capability_creation", name: "Capability Creation", roleKo: "Capability 생성", category: "platform_mutation", phase: 2, status: "implemented", modules: ["hub-workspace-tools:capability.create"] },
  { id: 43, slug: "capability_modification", name: "Capability Modification", roleKo: "Capability 수정", category: "platform_mutation", phase: 2, status: "implemented", modules: ["hub-workspace-tools:capability.update", "lib/hub/dev/capability-patch.ts"] },
  { id: 44, slug: "capability_removal", name: "Capability Removal", roleKo: "Capability 제거", category: "platform_mutation", phase: 2, status: "partial", modules: ["hub-workspace-tools:capability.delete"] },
  { id: 45, slug: "workflow_creation", name: "Workflow Creation", roleKo: "Workflow 생성", category: "platform_mutation", phase: 2, status: "implemented", modules: ["hub-workspace-tools:workflow.create"] },
  { id: 46, slug: "workflow_modification", name: "Workflow Modification", roleKo: "Workflow 수정", category: "platform_mutation", phase: 2, status: "implemented", modules: ["hub-workspace-tools:workflow.update"] },
  { id: 47, slug: "schema_creation", name: "Schema Creation", roleKo: "Schema 생성", category: "platform_mutation", phase: 2, status: "partial", modules: ["hub-workspace-tools:schema.update"] },
  { id: 48, slug: "schema_modification", name: "Schema Modification", roleKo: "Schema 수정", category: "platform_mutation", phase: 2, status: "implemented", modules: ["hub-workspace-tools:schema.update"] },
  { id: 49, slug: "permission_modification", name: "Permission Modification", roleKo: "권한 수정", category: "platform_mutation", phase: 2, status: "partial", modules: ["hub-workspace-tools:permission.update"] },
  { id: 50, slug: "platform_refactoring", name: "Platform Refactoring", roleKo: "Platform 구조 개선", category: "platform_mutation", phase: 2, status: "planned", modules: [] },

  // F. Coding Agent — 51~60
  { id: 51, slug: "file_creation", name: "File Creation", roleKo: "파일 생성", category: "coding_agent", phase: 2, status: "planned", modules: [] },
  { id: 52, slug: "file_modification", name: "File Modification", roleKo: "파일 수정", category: "coding_agent", phase: 2, status: "partial", modules: ["hub-workspace-tools:code.modifyFile", "lib/hub/dev/coding-agent/coding-sandbox.ts"] },
  { id: 53, slug: "file_deletion", name: "File Deletion", roleKo: "파일 삭제", category: "coding_agent", phase: 2, status: "planned", modules: [] },
  { id: 54, slug: "multi_file_editing", name: "Multi-file Editing", roleKo: "여러 파일 수정", category: "coding_agent", phase: 2, status: "implemented", modules: ["lib/hub/dev/coding-agent/coding-sandbox.ts"] },
  { id: 55, slug: "function_editing", name: "Function Editing", roleKo: "함수 수정", category: "coding_agent", phase: 2, status: "partial", modules: ["hub-workspace-tools:code.modifyFile"] },
  { id: 56, slug: "class_editing", name: "Class Editing", roleKo: "클래스 수정", category: "coding_agent", phase: 2, status: "planned", modules: [] },
  { id: 57, slug: "code_generation", name: "Code Generation", roleKo: "코드 생성", category: "coding_agent", phase: 2, status: "partial", modules: ["lib/hub/dev/coding-agent/coding-sandbox.ts"] },
  { id: 58, slug: "code_transformation", name: "Code Transformation", roleKo: "코드 변환", category: "coding_agent", phase: 2, status: "planned", modules: [] },
  { id: 59, slug: "refactoring", name: "Refactoring", roleKo: "코드 구조 개선", category: "coding_agent", phase: 2, status: "planned", modules: [] },
  { id: 60, slug: "minimal_patch", name: "Minimal Patch Generation", roleKo: "최소 수정", category: "coding_agent", phase: 2, status: "implemented", modules: ["lib/hub/dev/coding-agent/coding-sandbox.ts"] },

  // G. Build / Test / Debug — 61~70
  { id: 61, slug: "test_discovery", name: "Test Discovery", roleKo: "관련 테스트 찾기", category: "build_test_debug", phase: 3, status: "planned", modules: [] },
  { id: 62, slug: "test_generation", name: "Test Generation", roleKo: "테스트 생성", category: "build_test_debug", phase: 3, status: "planned", modules: [] },
  { id: 63, slug: "unit_test_execution", name: "Unit Test Execution", roleKo: "Unit Test", category: "build_test_debug", phase: 3, status: "partial", modules: ["hub-workspace-tools:test.run"] },
  { id: 64, slug: "integration_test_execution", name: "Integration Test Execution", roleKo: "Integration Test", category: "build_test_debug", phase: 3, status: "planned", modules: [] },
  { id: 65, slug: "e2e_test_execution", name: "E2E Test Execution", roleKo: "E2E Test", category: "build_test_debug", phase: 3, status: "planned", modules: [] },
  { id: 66, slug: "build_execution", name: "Build Execution", roleKo: "Build", category: "build_test_debug", phase: 3, status: "partial", modules: ["hub-workspace-tools:build.run"] },
  { id: 67, slug: "lint_execution", name: "Lint Execution", roleKo: "Lint", category: "build_test_debug", phase: 3, status: "planned", modules: [] },
  { id: 68, slug: "type_check", name: "Type Check", roleKo: "Type 검사", category: "build_test_debug", phase: 3, status: "planned", modules: [] },
  { id: 69, slug: "error_analysis", name: "Error Analysis", roleKo: "에러 분석", category: "build_test_debug", phase: 3, status: "implemented", modules: ["lib/hub/dev/hub-error-analysis.ts", "lib/hub/dev/dev-project-state.ts"] },
  { id: 70, slug: "root_cause_analysis", name: "Root Cause Analysis", roleKo: "근본 원인 분석", category: "build_test_debug", phase: 3, status: "implemented", modules: ["lib/hub/dev/hub-error-analysis.ts", "lib/hub/dev/hub-verify-repair.ts"] },

  // H. Self-Repair / Agent Loop — 71~80
  { id: 71, slug: "observe", name: "Observe", roleKo: "현재 상태 관찰", category: "self_repair_loop", phase: 3, status: "implemented", modules: ["lib/hub/dev/hub-agent-loop.ts", "lib/agent/hub-observation/"] },
  { id: 72, slug: "act", name: "Act", roleKo: "실제 변경/행동", category: "self_repair_loop", phase: 3, status: "implemented", modules: ["lib/hub/dev/hub-workspace-tools.ts"] },
  { id: 73, slug: "verify", name: "Verify", roleKo: "결과 검증", category: "self_repair_loop", phase: 3, status: "partial", modules: ["lib/agent/loop/verification.ts", "lib/hub/dev/hub-agent-loop.ts", "lib/hub/dev/hub-verify-repair.ts"] },
  { id: 74, slug: "replan", name: "Replan", roleKo: "재계획", category: "self_repair_loop", phase: 3, status: "partial", modules: ["lib/hub/dev/hub-agent-loop.ts", "lib/hub/dev/hub-verify-repair.ts", "lib/hub/dev/coding-agent/coding-agent-loop.ts"] },
  { id: 75, slug: "automatic_error_fix", name: "Automatic Error Fix", roleKo: "오류 자동 수정", category: "self_repair_loop", phase: 3, status: "implemented", modules: ["lib/hub/dev/hub-verify-repair.ts", "lib/hub/dev/coding-agent/coding-agent-loop.ts"] },
  { id: 76, slug: "retry_strategy", name: "Retry Strategy", roleKo: "재시도 전략", category: "self_repair_loop", phase: 3, status: "partial", modules: ["lib/agent/loop/agent-state.ts"] },
  { id: 77, slug: "regression_detection", name: "Regression Detection", roleKo: "회귀 감지", category: "self_repair_loop", phase: 3, status: "implemented", modules: ["lib/hub/dev/hub-verify-repair.ts", "lib/hub/dev/hub-checkpoint-store.ts"] },
  { id: 78, slug: "regression_repair", name: "Regression Repair", roleKo: "회귀 수정", category: "self_repair_loop", phase: 3, status: "planned", modules: [] },
  { id: 79, slug: "task_completion_detection", name: "Task Completion Detection", roleKo: "완료 판정", category: "self_repair_loop", phase: 3, status: "partial", modules: ["lib/hub/dev/hub-agent-loop.ts"] },
  { id: 80, slug: "long_running_task_management", name: "Long-running Task Management", roleKo: "긴 작업 지속", category: "self_repair_loop", phase: 3, status: "partial", modules: ["lib/hub/dev/hub-connection-store.ts"] },

  // I. Runtime / Preview / Browser — 81~90
  { id: 81, slug: "terminal_execution", name: "Terminal Execution", roleKo: "터미널 실행", category: "runtime_preview_browser", phase: 4, status: "partial", modules: ["hub-workspace-tools:terminal.run"] },
  { id: 82, slug: "dev_server_control", name: "Dev Server Control", roleKo: "개발 서버 관리", category: "runtime_preview_browser", phase: 4, status: "planned", modules: [] },
  { id: 83, slug: "runtime_log_inspection", name: "Runtime Log Inspection", roleKo: "실행 로그 분석", category: "runtime_preview_browser", phase: 4, status: "partial", modules: ["lib/agent/events/agent-event-types.ts"] },
  { id: 84, slug: "preview_launch", name: "Preview Launch", roleKo: "Preview 실행", category: "runtime_preview_browser", phase: 4, status: "partial", modules: ["hub-workspace-tools:preview.run", "lib/hub/dev/sandbox-preview.ts"] },
  { id: 85, slug: "preview_inspection", name: "Preview Inspection", roleKo: "Preview 결과 확인", category: "runtime_preview_browser", phase: 4, status: "implemented", modules: ["lib/hub/dev/preview-agent-verify.ts", "lib/hub/dev/sandbox-preview.ts"] },
  { id: 86, slug: "browser_navigation", name: "Browser Navigation", roleKo: "브라우저 이동", category: "runtime_preview_browser", phase: 4, status: "partial", modules: ["lib/hub/dev/sandbox-preview.ts"] },
  { id: 87, slug: "browser_interaction", name: "Browser Interaction", roleKo: "버튼/폼 조작", category: "runtime_preview_browser", phase: 4, status: "partial", modules: ["lib/hub/dev/sandbox-preview.ts"] },
  { id: 88, slug: "screenshot_analysis", name: "Screenshot Analysis", roleKo: "화면 분석", category: "runtime_preview_browser", phase: 4, status: "partial", modules: ["lib/hub/dev/sandbox-preview.ts"] },
  { id: 89, slug: "console_inspection", name: "Console Inspection", roleKo: "Console 확인", category: "runtime_preview_browser", phase: 4, status: "partial", modules: ["lib/hub/dev/sandbox-preview.ts"] },
  { id: 90, slug: "network_inspection", name: "Network Inspection", roleKo: "Network 분석", category: "runtime_preview_browser", phase: 4, status: "partial", modules: ["lib/hub/dev/sandbox-preview.ts"] },

  // J. Change / Safety / Publish — 91~100
  { id: 91, slug: "change_tracking", name: "Change Tracking", roleKo: "변경 추적", category: "change_safety_publish", phase: 5, status: "partial", modules: ["lib/agent/events/agent-event-types.ts", "lib/hub/dev/dev-project-state.ts"] },
  { id: 92, slug: "diff_generation", name: "Diff Generation", roleKo: "Diff 생성", category: "change_safety_publish", phase: 5, status: "partial", modules: ["lib/hub/dev/operator-diff.ts"] },
  { id: 93, slug: "change_explanation", name: "Change Explanation", roleKo: "변경 설명", category: "change_safety_publish", phase: 5, status: "implemented", modules: ["lib/hub/dev/hub-change-explanation.ts", "lib/agent/events/agent-event-bridge.ts"] },
  { id: 94, slug: "checkpoint", name: "Checkpoint", roleKo: "작업 전 상태 저장", category: "change_safety_publish", phase: 5, status: "implemented", modules: ["lib/hub/dev/hub-checkpoint-store.ts", "lib/agent/events/agent-event-bridge.ts"] },
  { id: 95, slug: "undo_rollback", name: "Undo / Rollback", roleKo: "작업 되돌리기", category: "change_safety_publish", phase: 5, status: "implemented", modules: ["lib/hub/dev/hub-checkpoint-store.ts"] },
  { id: 96, slug: "approval_gate", name: "Approval Gate", roleKo: "사용자 승인", category: "change_safety_publish", phase: 5, status: "implemented", modules: ["lib/agent/approval/approval-engine.ts"] },
  { id: 97, slug: "policy_enforcement", name: "Policy Enforcement", roleKo: "Agent 권한 제한", category: "change_safety_publish", phase: 5, status: "partial", modules: ["lib/hub/dev/hub-tool-catalog.ts", "lib/hub/dev/coding-agent/coding-sandbox.ts"] },
  { id: 98, slug: "secret_protection", name: "Secret Protection", roleKo: "Secret 보호", category: "change_safety_publish", phase: 5, status: "partial", modules: ["lib/hub/dev/coding-agent/coding-sandbox.ts"] },
  { id: 99, slug: "publish_deploy", name: "Publish / Deploy", roleKo: "배포", category: "change_safety_publish", phase: 5, status: "partial", modules: ["lib/hub/dev/hub-publish-flow.ts", "lib/hub/dev/hub-publish-pending-store.ts", "hub-workspace-tools:publish.request"] },
  { id: 100, slug: "audit_trail", name: "Audit Trail", roleKo: "Agent 행동 기록", category: "change_safety_publish", phase: 5, status: "partial", modules: ["lib/agent/events/agent-event-bridge.ts"] },
] as const;

/** Phase 1 must-ship capability IDs (product priority). */
export const PHASE_1_CAPABILITY_IDS: readonly number[] = [
  1, 2, 3, 4, 6, 11, 13, 14, 21, 22, 23, 24, 29, 31, 32, 39,
] as const;

export const PHASE_2_CAPABILITY_IDS: readonly number[] = [
  41, 42, 43, 45, 46, 47, 51, 52, 54, 57, 60,
] as const;

export const PHASE_3_CAPABILITY_IDS: readonly number[] = [
  61, 63, 66, 69, 70, 71, 72, 73, 74, 75, 76, 77, 79,
] as const;

export const PHASE_4_CAPABILITY_IDS: readonly number[] = [
  81, 83, 84, 85, 86, 87, 88, 89, 90,
] as const;

export const PHASE_5_CAPABILITY_IDS: readonly number[] = [
  91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
] as const;

export function getAgentCapability(id: number): RimvioAgentCapability | undefined {
  return RIMVIO_AGENT_CAPABILITIES.find((c) => c.id === id);
}

export function capabilitiesByPhase(phase: AgentCapabilityPhase): readonly RimvioAgentCapability[] {
  return RIMVIO_AGENT_CAPABILITIES.filter((c) => c.phase === phase);
}

export function capabilityCoverage(input: {
  readonly phase?: AgentCapabilityPhase;
}): {
  readonly implemented: number;
  readonly partial: number;
  readonly planned: number;
  readonly total: number;
  readonly pctReady: number;
} {
  const list = input.phase
    ? capabilitiesByPhase(input.phase)
    : RIMVIO_AGENT_CAPABILITIES;
  const implemented = list.filter((c) => c.status === "implemented").length;
  const partial = list.filter((c) => c.status === "partial").length;
  const planned = list.filter((c) => c.status === "planned").length;
  const total = list.length;
  const pctReady = Math.round(((implemented + partial * 0.5) / total) * 100);
  return { implemented, partial, planned, total, pctReady };
}

/** Progressive context narrowing — Rimvio vs naive full-repo read */
export const CONTEXT_NARROWING_LADDER = [
  "goal",
  "platform",
  "capability",
  "dependency",
  "relevant_files",
  "relevant_symbols",
  "relevant_code",
] as const;
