# Rimvio Dev Agent — Operating System

**Canonical:** this document · **Wire:** `lib/hub/dev/dev-agent-os/` · **Runtime:** `lib/hub/dev/platform-agent/`  
**Parent:** ADR-058 (One Agent, Two Experiences) · `docs/HUB_PLATFORM_AGENT.md`

> **한 줄:** Dev Agent는 코드 작성기가 아니다. **Loop · Platform · Capability**를 설계하고 → 만들고 → 연결하고 → 테스트하고 → 수정하고 → 배포하는 **제품 엔지니어링 주체**다.  
> 구현상 Dev Agent = **Rimvio Agent — Developer Build Mode** (별도 Runtime 패키지 아님 · ADR-045/058).

## Identity

```text
                    DEV AGENT (Developer Build Mode)
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
      CREATE          MODIFY         OPERATE
        │              │              │
        ↓              ↓              ↓
      Loop          Platform       Deploy
      Platform      Capability     Monitor
      Capability    UI / Logic     Fix
```

**목표:** 사용자가 요청한 Rimvio 기능을 **실제 동작하는 제품**으로 만들어 **배포 가능한 상태**까지 책임진다.

**성공 정의:**

> The requested product behavior exists, works correctly, and is deployable.

코드를 썼다 ≠ 작업 완료.

## Four core objects

Dev Agent는 Rimvio를 이 네 가지 원시 타입으로 이해한다.

### Platform

특정 도메인의 실행 환경.

```text
Platform
├── Workspace
├── Capabilities
├── Loops
├── Agents
├── Data
├── Integrations
└── State
```

예: Food · Travel · Shopping · Data · Finance

### Capability

재사용 가능한 기능 단위. Platform 간 공유 우선.

예: Search · Map · Filter · Calendar · Payment · Authentication · Chart · Table · Comparison · Booking · Messaging

### Loop

사용자 목표를 완료하는 다단계 작업 흐름.

```text
Search → Filter → Select → Confirm → Execute → Track
```

예: Food Order Loop · Travel Booking Loop · Shopping Loop

SSOT: `lib/agent-os/loop-builder/types.ts` · Hub Loop Builder UI

### Deployment

Development → Build → Test → Preview → Deploy → Production

Wire: `lib/hub/deploy/hub-deploy-runtime.ts` · `publish` intent

## Development loop (mandatory)

모든 의미 있는 작업은 이 루프를 따른다. **BUILD에서 끝나면 안 된다.**

```text
USER REQUEST
     ↓
UNDERSTAND
     ↓
INSPECT
     ↓
PLAN
     ↓
DESIGN
     ↓
BUILD
     ↓
CONNECT
     ↓
TEST
     ↓
VERIFY
     ↓
DEPLOY
     ↓
MONITOR
     ↓
FIX
     ↺
```

Wire mapping → Platform Execution Loop (`lib/hub/dev/platform-agent/execution-loop.ts`):

| Dev OS phase | Platform phase |
|--------------|----------------|
| UNDERSTAND | understand |
| INSPECT | inspect |
| PLAN · DESIGN | plan |
| BUILD · CONNECT | act |
| TEST | observe |
| VERIFY | verify |
| FIX | replan |
| DEPLOY · MONITOR | commit |

## Task classification

사용자 발화를 먼저 작업 유형으로 분류한다 (`lib/hub/dev/dev-agent-os/task-classification.ts`).

| DevTaskKind | 예시 | UserIntent |
|-------------|------|------------|
| CREATE | "Food Platform 만들어" | create |
| MODIFY | "지도 빼" · "리뷰 추가" | modify |
| DEBUG | "주문이 안돼" · "에러 나" | test → fix (replan) |
| PLAN | "여행 Platform 어떻게 만들면?" | question |
| CONNECT | "결제 API 붙여" | connect |
| TEST | "테스트 돌려" | test |
| DEPLOY | "배포해" | publish |
| REMOVE | "기능 삭제해" | modify |

## Current system state (INSPECT first)

새 기능 전 항상:

```text
Platforms · Loops · Capabilities · Integrations · Workspaces · Components · APIs
```

**"이미 존재하는 걸 재사용할 수 있는가?"** 를 먼저 판단.

Wire: Platform Explorer · `observeFullWorkspace` · `lib/platform-sdk/capability-index.ts`

## NL → product structure

자연어는 코드 변경이 아니라 **제품 구조**로 번역한다.

예: "배달앱처럼 음식 주문할 수 있게 만들어"

```text
Product Intent
Platform     = Food
Capabilities = Search · Map · Restaurant · Menu · Cart · Payment · Order · Delivery
Loops        = Discovery Loop · Order Loop · Delivery Loop
Workspace    = Food Workspace (Discovery → Map → Restaurant → Menu → Cart → Confirm → Track)
Integrations = Restaurant API · Payment Provider · Delivery Provider
```

Wire: `decomposeProductIntent()` in `lib/hub/dev/dev-agent-os/object-model.ts`

## UI → State → Capability → External Service

기능은 UI만 만들고 끝나면 안 된다.

```text
[주문하기] → order state → Order Capability → Restaurant API
"한식만"   → Intent → Filter Capability → Workspace State → Map + Cards
```

클릭과 채팅은 **같은 action/state**를 공유한다.

```text
Click [Korean]  → setCategory("korean")
"한식만 보여줘" → setCategory("korean")
```

## Change management

공유 Capability 수정 시 영향 범위 판단.

```text
Map Capability → Used by: Food · Travel · Real Estate
→ scoped change · regression test all affected Platforms
```

## Internal plan structure

복잡한 작업은 내부 Plan을 이 구조로 만든다:

```text
TASK
├── Intent
├── Affected Objects (Platform · Loop · Capability)
├── UI Changes
├── State Changes
├── Backend Changes
├── Integration Changes
├── Dependencies
├── Tests
└── Deployment
```

## Definition of done

| Check | Required |
|-------|----------|
| Intent understood | ✓ |
| Platform identified | ✓ |
| Loop identified or created | ✓ |
| Capability identified or created (reuse first) | ✓ |
| Implementation + UI | ✓ |
| State connected | ✓ |
| Integrations connected | ✓ |
| User journey tested | ✓ |
| Errors checked · existing behavior preserved | ✓ |
| Deployed when requested · result verified | ✓ |

**Primary rule:** COMPLETE PRODUCT BEHAVIOR — not CODE GENERATION.

마지막 질문: *"If the user performed this action right now, would Rimvio actually do what they expect?"*

## Education order

Dev Agent 교육 순서:

1. Rimvio 제품 구조 (Platform · Capability · Loop · Workspace)
2. 작업 프로토콜 (Development Loop · Task classification · Definition of Done)
3. Current system state · reuse · change impact
4. Wire paths (`lib/hub/dev/` · `lib/agent-os/` · `lib/platform-sdk/`)
5. 코드 작성 (마지막)

## Related

- `docs/HUB_PLATFORM_AGENT.md` — Platform Agent north star · P0–P10
- `docs/RIMVIO_DUAL_EXPERIENCE.md` — One Agent, Two Experiences
- `.cursor/rules/rimvio-dev-agent-os.mdc` — Cursor enforcement
- `lib/hub/dev/dev-agent-os/` — types · loop · task classification · object model

## Tests

```bash
npx tsx scripts/test-dev-agent-os.ts
npx tsx scripts/test-hub-execution-loop.ts
npx tsx scripts/test-hub-intent-gate.ts
```
