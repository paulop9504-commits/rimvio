# Rimvio Harness — Cursor Phase Prompts

> 한 세션 = **Master 1회 + 현재 Phase만**.  
> 스크린샷은 visual reference일 뿐, 픽셀 복제 금지.  
> 레포 제약: npm+Next · `lib/` SSOT · **새 Agent Runtime 패키지 금지 (ADR-045)** · Playwright는 `lib/sandbox/browser` · `apps/local-agent` 재사용.

전문 빌드 플랜: [`BUILD_PLAN.md`](./BUILD_PLAN.md)

---

## MASTER (세션 첫 메시지)

```text
너는 Rimvio의 Principal Product Engineer이자 Agent Infrastructure Architect다.

우리는 "Rimvio Harness"라는 Agent Action Infrastructure를 이 레포 안에서 개발한다.
목적: 사람이 수행하는 실제 업무를 AI가 실행 가능한 구조로 변환.

Human Knowledge → Harness → Action → Capability → Permission → Constraint
→ Verification → Runtime → Real World Action

Harness = Workflow 장식이 아니라 Action Specification (실행 명세).

두 표면:
1) Harness Builder — WHAT (Trigger→Research→Extract→Compare→Report→Verify)
2) Harness Labeller — HOW (GET/CLICK/TYPE/WAIT/EXTRACT …)

철학: Human Action → Structured Action → AI Executable Action
Fake UI / mock execution / hardcoded business data 금지.
UI는 실제 Harness state에 연결.

스택(이 레포):
- TypeScript · Next.js · React · Tailwind (기존)
- API: app/api (Hono 신설 금지)
- Browser Runtime: Playwright (lib/sandbox/browser · apps/local-agent)
- DB: Supabase
- Validation: Zod 도입 가능 (Harness 스키마부터)
- 패키지: 기존 lib/* 확장 (pnpm monorepo rewrite 금지)

원칙:
TypeScript-first · Schema-first · Runtime-first · traceable · verifiable
Permissions explicit · errors recoverable · Harness versionable · serializable · executable
No duplicate Agent OS — extend rimvio-protocol / capability / sandbox / workstream

FIRST: inspect existing repo (hub, capability-specification, permissions, playwright-runtime).
Do not rewrite architecture. Keep app runnable.
User should feel: "I am teaching an AI how to perform a real-world task."
```

---

## PHASE 1 — Data model only (UI 금지)

```text
Phase 1만 구현. UI / Marketplace / AI generation / self-learning 금지.

위치:
- lib/rimvio-protocol/harness/  (schemas + types SSOT)
- lib/harness/                  (validate, serialize, repository iface, execution-state types)
기존 capability-specification · platform-sdk/permissions 와 용어를 맞추고 중복 OS 만들지 말 것.

모델:
Harness { id, name, description, version, status, type, runtime, inputSchema, outputSchema,
  nodes, permissions, constraints, verification, metadata, createdAt, updatedAt }
Node { id, type, name, description, position, input, output, actions, permissions,
  constraints, verification, retry, timeout, onError }
NodeTypes: TRIGGER | RESEARCH | EXTRACT | ACTION | CONDITION | REPORT | VERIFY
Action { id, type, target, selector, input, variable, waitFor, timeout, retry, verification }
ActionTypes: OBSERVE | NAVIGATE | CLICK | TYPE | SCROLL | READ | EXTRACT | CREATE | UPDATE | DELETE | EXECUTE | COMMUNICATE
Permission { type, scope, resource, approvalRequired }
Verification { id, type, target, condition, expected, severity }
Constraint { field, operator, value, action }
Runtime { type, environment, browser, permissions, networkPolicy, secretsPolicy }

Zod schemas + TS types 먼저.
그다음: validation · serialization · in-memory repository · execution state types.
시각 UI 만들지 말 것.
스크립트 테스트 1개: scripts/test-harness-schema.ts
끝나면 typecheck 해당 경로 + 테스트 통과.
```

---

## PHASE 2 — Builder UI

```text
Harness Builder UI만. 데이터는 Phase 1 Harness state.

레이아웃: LEFT steps(7) | CENTER canvas | RIGHT AI | BOTTOM node detail
노드/엣지는 Harness.nodes에서 렌더 (하드코딩 금지).
AI 채팅은 실제 Harness state를 바꾸는 structured patch만 (fake chat 금지).
디자인: premium SaaS · 스크린샷은 reference · 기존 Hub/design tokens 재사용.
라우트: app/hub/harness/builder (또는 기존 hub/build 확장 — 중복 페이지 남발 금지)
```

---

## PHASE 3 — Labeller

```text
Harness Labeller: 사람이 실제 사이트에서 Agent HOW를 라벨링.
LEFT overview+timeline | CENTER browser preview | RIGHT element/action | BOTTOM extract/verify/exceptions
매 라벨 → serializable Action object (CLICK/TYPE/WAIT/EXTRACT …)
스크린샷만 저장 금지. Runtime이 실행 가능한 Action Definition 산출.
Playwright 연결은 Phase 4와 맞물리게 인터페이스만 두고, 가능하면 sandbox browser 재사용.
```

---

## PHASE 4 — Browser Runtime

```text
Labeller/Builder 산출 → Execution Engine → Playwright → Observation → Verification → Log
executeHarness / executeNode / executeAction / verify / handleError
루프: permission → constraint → locate → execute → observe → verify → log
성공 시뮬 금지. lib/sandbox/browser/playwright-runtime.ts 확장.
Execution log: executionId, harnessId, actionId, status, observation, verification, error, duration
```

---

## PHASE 5 — Harness Agent

```text
NL → Objective/Inputs/Outputs/Capabilities/Actions/Permissions/Constraints/Verification/Runtime/Graph
enterRimvioAgentRuntime / capability 경로와 충돌 없이 Harness generator stage로 연결.
결제·삭제·금융·외부통신·민감정보는 approvalRequired.
채팅 커맨드는 structured state change + Canvas 즉시 반영.
```

---

## PHASE 6 — Publish / Registry

```text
DRAFT → TESTING → VERIFIED → PUBLISHED → DEPRECATED
Publish 전: schema/permission/constraint/runtime/verification + sandbox test + security
Harness Manifest versioned. Published version immutable.
Registry interface → 이후 Capability Registry에 흡수 가능하게.
Marketplace / Creator Economy UI 금지.
```
