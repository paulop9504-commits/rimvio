# Rimvio Harness — Build Plan (SSOT)

> **UI 스크린샷을 픽셀로 복제하지 않는다.**  
> 순서: **뼈대 → 데이터 모델 → 실행 엔진 → UI → AI → Publish**  
> 철학: Human Knowledge → Harness → Runtime → Verification → Real World Action

관련: Capability Spec (`lib/rimvio-protocol/capability-specification.ts`) · ADR-045 One Agent Runtime · Hub (`app/hub/`) · Playwright (`lib/sandbox/browser/playwright-runtime.ts`)

---

## 제품 분해

```text
              RIMVIO HARNESS
                   │
    ┌──────────────┴──────────────┐
    │                             │
Harness Builder              Harness Labeller
 "무엇을 할 것인가?"            "어떻게 행동하는가?"
    WHAT                          HOW
    │                             │
    └──────────────┬──────────────┘
                   ↓
            Rimvio Standard
                   ↓
         Capability / Harness
                   ↓
               Runtime
                   ↓
          실제 웹 / PC 실행
```

| 표면 | 역할 | 기존 레포 앵커 |
|------|------|----------------|
| **Builder** | 고수준 그래프 (Trigger→…→Verify) | `app/hub/build` · `create` · Hub capability steps |
| **Labeller** | 저수준 Action (CLICK/TYPE/EXTRACT) | 신규 UI · 산출물은 Runtime Action Definition |
| **Runtime** | Playwright 실행 + Verify | `lib/sandbox/browser/` · `apps/local-agent` |
| **Agent** | NL → Harness 생성 | `lib/workstream/rimvio-agent-runtime.ts` (새 Runtime 금지) |
| **Registry** | Publish · version | `lib/capability-registry` · `lib/capability-ledger` |

---

## 이 레포에 맞춘 기술 결정 (프롬프트 원안 수정)

| 원안 프롬프트 | Rimvio 실제 |
|---------------|-------------|
| pnpm monorepo `packages/*` | **유지:** npm + Next root · `lib/*` |
| Hono 별도 서버 | **유지:** `app/api/*` |
| 새 `packages/runtime` | **금지 (ADR-045)** — `lib/sandbox` · `capability-runtime` · `workstream` 확장 |
| 새 Agent OS | **금지** — `enterRimvioAgentRuntime` / Capability Spec 확장 |
| Zod 전면 | Phase 1에서 Harness 스키마에 도입 가능 · 기존 hand-roll과 병행 |
| Fake UI / mock success | **금지** |

권장 코드 위치:

```text
lib/rimvio-protocol/harness/     ← Zod + types (Phase 1 SSOT)
lib/harness/                     ← service · serialize · validate · execution-state
lib/sandbox/browser/             ← Playwright executeAction (기존 확장)
app/hub/harness/                 ← Builder / Labeller routes (UI 단계)
apps/local-agent/                ← PC/Browser worker (기존)
docs/harness/                    ← 이 문서 · phase prompts
```

---

## 개발 순서 (한 번에 전체 넣지 말 것)

```text
① Repository 분석          ✅ 완료 (기존 Hub/Capability/Sandbox/Playwright)
② Data Model
③ Schema (Zod/TS)
④ Harness CRUD / serialize
⑤ Builder Canvas UI
⑥ Labeller UI
⑦ Playwright Runtime wire
⑧ Execution Log
⑨ Verification
⑩ AI Agent (NL → Harness)
⑪ Sandbox Test
⑫ Publish / Registry
```

각 단계마다: `구현 → typecheck → 해당 test → build 가능 유지`

### Phase에서 명시적으로 미룸
Creator Economy · Marketplace · Mobile runtime · Enterprise governance · Self-learning · 복잡한 Loop Builder

---

## Phase 체크리스트

| Phase | 산출물 | Done |
|-------|--------|------|
| 0 Master | 이 문서 + Cursor phase prompts | ✅ |
| 1 Model | `Harness` · `Node` · `Action` · … schemas | ✅ |
| 1b Labeller sandbox | Web/Local 선택 + 순차 labelling UI (`/hub/harness/labeller`) | ✅ |
| 2 Builder | Canvas · steps · AI panel **→ real Harness state** (`/hub/harness/builder`) | ✅ |
| 3–4 Runtime | Browser execute + Labeller sandbox run (`/api/hub/harness/execute`) | ✅ |
| 4b Local | DESKTOP → PC Local Agent OPEN_URL dispatch | ✅ |
| 5 Agent | NL → Harness graph (`/api/hub/harness/generate`) | ✅ |
| 6a Personal library | 계정 격리 저장 · on/off · RLS (`user_harnesses` · `/hub/harness/library`) | ✅ |
| 6 Publish | Registry / marketplace | ☐ |
| 3 Labeller | Browser inspect · Action Definition 산출 | ☐ |
| 4 Runtime | `executeHarness` · permission gate · verify · logs | ☐ |
| 5 Agent | NL → Harness graph (approval for dangerous) | ☐ |
| 6 Publish | DRAFT→…→PUBLISHED · versioned manifest · Registry iface | ☐ |

---

## Cursor / Claude에 넣는 법

1. 세션 시작: `docs/harness/CURSOR_PHASE_PROMPTS.md` 의 **Master** 한 번  
2. 이어서 **현재 Phase만** 붙여넣기  
3. “기존 아키텍처 rewrite 금지 · ADR-045 준수” 유지  
4. Phase 통과 전 다음 Phase 프롬프트 넣지 않기  

팀 역할 매핑: [`TEAM_ROSTER.md`](../TEAM_ROSTER.md)  
- FE 최찬환 → Builder/Labeller UI  
- BE 박건수 → Runtime / execution log  
- BE 구희승 → Standard schemas / permission / verify  
- 리드 → 머지 · phase gate  
