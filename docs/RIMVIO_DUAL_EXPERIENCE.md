# Rimvio Dual Experience — One Agent, Two Experiences

**Status:** CANON (product UX + architecture SSOT)  
**Audience:** PM · design · engineering · every Cursor agent  
**Parent:** [RIMVIO_PRODUCT_DEFINITION.md](./RIMVIO_PRODUCT_DEFINITION.md) · [RIMVIO_OS_CONSTITUTION.md](./RIMVIO_OS_CONSTITUTION.md)  
**Wire:** `lib/rimvio-protocol/` · `lib/platform-sdk/` · `lib/platform-builder/` · `lib/hub/deploy/` · `lib/context-run/` · `lib/workstream/`  
**ADR:** [058](./adr/058-dual-experience-hub-dev-workspace.md) · [059](./adr/059-platform-capability-ownership.md) · [060](./adr/060-creator-operations-vs-rimvio-os.md) · [061](./adr/061-certification-and-product-boundary.md) · [062](./adr/062-rimvio-core-vs-dev-runtime.md) · [063](./adr/063-capability-specification-model.md) · [064](./adr/064-hub-compatibility-validation-graph.md) · **Core OS:** [RIMVIO_CORE_OS.md](./RIMVIO_CORE_OS.md)

> **한 줄:** **Rimvio Agent는 하나**다. **User Experience**(Capability 발견·실행)와 **Developer Experience**(Platform 개발·테스트·Publish)는 **같은 Agent**의 두 Context — 별도 User Agent / Dev Agent **아님**.  
> UI에는 **AI Build**라고 써도 되나, 구현상 **Rimvio Agent — Developer Build Mode**다.

---

## 0. One Agent, Two Experiences (절대 원칙)

```text
                         RIMVIO AGENT  (하나)
                               │
               ┌───────────────┴───────────────┐
               │                               │
        User Context                   Developer Context
               │                               │
            Execute                          Build
               │                               │
         Capability                    Platform Development
         Discovery                            │
               │              ┌────────────────┼────────────────┐
               │              │                │                │
               │            Code             Data           Workflow
               │              │                │                │
               │              └────────────────┼────────────────┘
               │                               │
               │                         Capabilities
               │                               │
               │                         Runtime / Infra bind
               │                               │
               │                         Test → Deploy → Publish
               │                               ↓
               │                         RIMVIO HUB
               │                               │
               │     ┌─────────────────────────┼─────────────────────────┐
               │     │                         │                         │
               │ Infrastructure            Capability                  Runtime
               │     │                         │                         │
               │     └──────────── Adapter ────┴─────────────────────────┘
               │                               │
               │                    Registry / Metadata / Compatibility
               │                               │
               └───────────────────────────────┤
                                               ↓
                                    Capability Discovery
                                               ↓
                                    Published Capability
                                               ↓
                                    Execution Binding
                                               ↓
                              Runtime / Adapter / Infrastructure
                                               ↓
                                           Execute
                                               ↓
                                    Prepare / Commit → User
```

| ❌ 금지 (구현·문서) | ✅ 정확한 표현 |
|-------------------|----------------|
| User Agent + Dev Agent (두 Agent) | **One Agent, Two Experiences** |
| AI Builder = 별도 Agent | **Rimvio Agent — Developer Build Mode** (UI: AI Build) |
| Agent → Platform Discovery | **Agent → Capability Discovery** only |
| Platform이 Agent의 능력 | **Published Capability**가 Agent의 능력 |
| Hub = Capability Registry만 | Hub = **Infrastructure · Capability · Runtime · Adapter** + Compatibility |
| `payment.process` (모호한 side effect) | **`payment.prepare` · `payment.commit` · `payment.refund`** |

**Platform** = Dev의 개발·운영 단위 (코드 · UI · Data · Workflow · Capability 묶음).  
**Agent가 발견·실행하는 것** = `OsakaStay`가 아니라 **`hotel.search`** 같은 **Published Capability**.

| 경험 | 표면 | Rimvio Agent Context | 금지 |
|------|------|----------------------|------|
| **User Experience** | Globe · Workspace · Field | Execute · Capability Discovery | Platform Discovery · 별도 User Agent |
| **Developer Experience** | Hub Dev Workspace · AI Build | Build · Platform Development | 별도 Dev Agent / AI Builder Agent |

---

## 1. Rimvio가 Dev에게 제공하는 레이어 (Platform OS)

Dev에게 **코드 에디터만** 주면 부족하다. Rimvio는 **Platform을 만들고 실행할 수 있는 OS 인프라**를 제공한다.

```text
                 DEV
                  │
        자연어 / 코드 / 설정
                  ↓
┌─────────────────────────────────────────┐
│          Rimvio Dev Workspace           │
│  AI Build · Editor · Preview · Graph    │  ← UI label; NOT a separate Agent
└──────────────────┬──────────────────────┘
                   ▼
         Rimvio Agent (Developer Context)
                   │
         Build Intent → Platform Blueprint → Dev Approval
                   ▼
┌─────────────────────────────────────────┐
│            RIMVIO PLATFORM OS           │
│  SDK · Runtime · Context · Permission   │
│  Auth · Data · Secrets · Sandbox        │
│  Test · Deploy · Logs · Commerce        │
└──────────────────┬──────────────────────┘
                   ▼
              Rimvio Hub (4 Stores + Compatibility)
                   ▼
         Published Capabilities → Agent Discovery
```

| Rimvio 제공 (인프라) | Dev가 하는 일 | 코드 SSOT (현재) |
|---------------------|---------------|------------------|
| AI Dev Workspace / **AI Build** | Rimvio Agent — Developer Build Mode; 자연어로 개발 | `components/hub/deploy/` · `lib/hub/deploy/hub-deploy-runtime.ts` |
| Capability Runtime | 비즈니스 로직 실행 | `lib/platform-sdk/platform-host.ts` |
| Capability Registry | Agent discovery (Published Capability) | `lib/platform-sdk/capability-index.ts` |
| Hub 4 Stores | Infra · Capability · Runtime · Adapter + Compatibility | `lib/hub/dev/*-registry.ts` · ADR-064 |
| Permission system | 권한 선언 | `lib/platform-sdk/permissions.ts` · ADR-047 |
| Context system | contextRequirements 선언 | `lib/rimvio-protocol/context.ts` |
| Builder / RIR | NL → Blueprint → manifest | `lib/platform-builder/` · ADR-055 |
| Market deployment | KR/JP/US… | `lib/platform-sdk/markets.ts` · ADR-056 |
| Sandbox test (MVP) | 실행 전 검증 | Hub wizard `runSandboxTest` · deploy runtime |
| Commerce / Prepare→Commit | 결제·예약 경계 | `lib/rimvio-protocol/commerce.ts` · Article 0 |
| Workflow engine | 🟡 설계·부분 | manifest `workflows` · platform draft |
| Secrets / Observability / Agent sim | 🟢 로드맵 | — |

### 1.2 Rimvio Core vs Dev Runtime (ADR-062)

**Agent Loop + State + Policy = Rimvio Core.** **Runtime Protocol 구현 = Rimvio Core + Dev (Hub 등록).**

```text
Agent Loop → Tool Registry → Capability Resolver → Runtime Router
                                    ↓
              Rimvio Core Runtime  |  Dev Runtime (Hub)
                                    ↓
                            Infrastructure (Adapter)
```

Capability는 OS를 직접 부르지 않음: `Capability → Rimvio Interface → Runtime → Infrastructure`

**Wire:** `lib/rimvio-core/` · `lib/hub/dev/runtime-registry.ts` · [RIMVIO_CORE_OS.md](./RIMVIO_CORE_OS.md)

Hub 네 Store: **Capability · Runtime · Infrastructure · Adapter** — Agent에 **직접 노출**되는 것은 **Published Capability**뿐. Infrastructure/Runtime/Adapter는 **Execution Binding**·**Compatibility Graph**를 통해 간접 연결 ([ADR-064](./adr/064-hub-compatibility-validation-graph.md)).

```text
Rimvio Infrastructure (Compute · DB · Network · Secrets · External Service)
        │
     Adapter  (Infrastructure → Rimvio Interface)
        │
   Capability  (Specification — what)
        │
     Runtime   (how — Router selects from Hub Registry)
        │
  Rimvio Agent (discovers Capability only)
```

Dev Workspace 예: `hotel.search` → Compatible Infrastructure (Osaka Hotel API · Maps · Hotel DB) · Compatible Runtime (Browser Runtime A) → **[Test]**

### 1.1 Creator 운영 vs Rimvio OS (ADR-060)

**사업 운영은 Creator/Team.** **개발 OS는 Rimvio.**

```text
              RIMVIO (OS)
                 │
        ┌────────┴────────┐
        ↓                 ↓
   Creator OS          Hub
        │                 │
        ↓                 ↓
  Platform Builder    Capabilities
        │
        ↓
   Hotel Platform  ← A가 운영
        │
        ├── Admin (호텔·객실·가격·예약)
        ├── Operations (일일 운영 큐)
        ├── Settlement (Creator 결제사 연동)
        └── Analytics
```

| A (Creator)가 관리 | Rimvio가 제공 |
|-------------------|---------------|
| 호텔/객실/가격/재고/예약/환불/프로모션/공급자/고객지원 | Dev Workspace · Runtime · Auth · Permission · Deploy · Registry · Agent · Monitoring |
| 자기 Payment Provider 연결 | Capability 실행 · Prepare→Commit · Webhook/Secret 인프라 |
| Platform Admin Console | Hub = Capability 배포·discovery (Rimvio 제품) |

**Build:** 검증된 Capability 레고 제안 → 선택 시 Platform에 설치.  
**Operate:** Deploy 후 Admin Console에서 실제 사업 운영 (Dev Workspace **Operate** 섹션에서 미리보기).  
**확장:** “주말 가격 20% 올려줘” → AI가 Dynamic Pricing Capability 제안 → Preview → Deploy.

**Wire:** `lib/hub/dev/creator-ops-model.ts` · `hub-dev-admin-console.tsx` · sidebar **Build · Ship · Operate · Connect**

---

## 2. USER / AGENT EXPERIENCE

### 2.1 원칙

- 사용자는 기술을 몰라도 된다. **자연어 한 문장**이 입력이다.
- Agent는 **외부 API를 임의 탐색하지 않는다** — Hub에 Publish·검증된 **Capability Registry**만 본다.
- **Prepare → Human Commit** — `booking.create`·`payment.commit` 같은 side effect는 사용자 승인 전 실행 금지 (Article 0).

### 2.2 파이프라인 (구현 필수 순서)

```text
User Utterance
      ↓
Intent Extraction        ← lib/rimvio-protocol/intent.ts · compile-nl-intent
      ↓
Entity + Constraint
      ↓
Task Graph               ← planObjectDiscovery · ADR-045 spine
      ↓
Capability Discovery     ← PUBLISHED only · NOT Platform · NOT vendor URL
      ↓
Published Capability     ← e.g. hotel.search (platformId = metadata)
      ↓
Execution Binding        ← Requirements · Compatibility Graph
      ↓
Runtime / Adapter / Infrastructure
      ↓
Execute (Prepare only)
      ↓
Human Commit             ← payment.commit · booking.confirm — Policy re-check
      ↓
Workspace / Event ledger (채팅 essay SSOT 금지)
```

`payment.commit` 호출 시 Runtime은 **Permission + Approval + Policy + Identity**를 **다시 검증**한 뒤 Execute (Article 0).

### 2.3 Capability Discovery 메커니즘 (핵심)

```text
❌ Agent → Platform Discovery
✅ Agent → Capability Discovery → Published Capability → Execution Binding → Runtime / Adapter / Infrastructure
```

Agent는 **Platform을 검색·실행하지 않는다.** `platformId` / `providerId`는 Capability 메타데이터일 뿐.

```text
Rimvio Agent
      ↓
Capability Registry (Published only)
      ↓
capabilityId + contract metadata
      ↓
Runtime Router + Compatibility Graph
      ↓
Execute
```

Capability metadata 최소 필드:

| Field | Purpose |
|-------|---------|
| `capabilityId` | e.g. `hotel.search` |
| `version` | semver · breaking change 경고 |
| `providerId` / `platformId` | e.g. `OsakaStay` |
| `inputSchema` / `outputSchema` | contract |
| `permissions` | runtime gate |
| `contextRequirements` | Agent context injection |
| `runtime` | sandbox \| native \| external |
| `actions` / `sideEffects` | prepare vs commit |
| `approvalPolicy` | human gate |

**UI 노출 (사용자):** 내부 스택 대신 work log 수준 — “호텔 검색 ✓ · 객실 확인 ✓ · 예약 준비 ✓ · 연결된 서비스 🏨 OsakaStay”

### 2.4 Reference flow: 호텔 예약 (OsakaStay)

| Step | User sees | Agent does | Commit? |
|------|-----------|------------|---------|
| 1 | 자연어 요청 | Intent + missing slot 질문 (Context에 있으면 재질문 금지) | No |
| 2 | “서비스 준비 중” | Registry에서 `hotel.search` … `payment.prepare` discovery | No |
| 3 | 지도 + 호텔 카드 | `hotel.search` execute → projection (Unit Canon: nightly vs total) | No |
| 4 | 호텔 상세 | `hotel.detail` · `room.availability` | No |
| 5 | 예약 요약 `READY_FOR_COMMIT` | `booking.prepare` | **Prepare** |
| 6 | 결제 확인 UI | `payment.prepare` | User taps 결제 = **Commit** |
| 7 | 예약 완료 + 번호 | `booking.confirm` · Workspace Day graph patch | Committed |

**Reasoning UX:** 전체 chain 노출 금지 — “난바역 도보 5분 · 평점 4.5+ 우선” 같은 **사용자 근거 한 줄**만.

### 2.5 사용자에게 숨기는 용어

기본 UI에서 노출 금지: Intent · Capability · Platform · Runtime · Manifest · API  
(설정/디버그 deep link에서만)

---

## 3. DEV / CREATOR EXPERIENCE

### 3.1 정의 (Cursor에게 전달할 문장)

> Rimvio Hub는 Capability 등록 폼이 아니다. Dev가 **Platform 전체**를 **AI-native Dev Workspace**에서 만들고, **Publish된 Capability**가 Registry에 올라가 **Rimvio Agent의 능력**이 된다. Platform 자체는 Agent 능력이 **아님**.

```text
Dev Workspace — Platform (개발 단위)
│
├── Code · UI · Data · Workflow
├── Runtime / Infrastructure bindings
└── Capabilities
       ├── hotel.search
       ├── booking.prepare
       └── payment.prepare / payment.commit / payment.refund
                ↓
             Publish (per Capability + Platform bundle options)
                ↓
          Rimvio Hub (4 Stores)
                ↓
       Capability Registry  ← Agent discovery SSOT
                ↓
          Rimvio Agent (User Context)
```

### 3.2 Dev Workspace 레이아웃 (Cursor-like)

```text
┌────────────┬─────────────────────┬─────────────────┐
│ Navigation │ AI Chat + Editor    │ Preview / Info  │
│ Platform   │                     │ Live Preview    │
│ AI Build   │ Code / Manifest     │ Capability card │
│ Capabilities│                    │ Runtime status  │
│ Data       │                     │ Deploy / Usage  │
│ Workflows  │                     │                 │
│ Runtime    │                     │                 │
│ Commerce   │                     │                 │
│ Deploy     │                     │                 │
└────────────┴─────────────────────┴─────────────────┘
```

**현재 구현:** `components/hub/deploy/hub-deploy-workspace.tsx` — 3열 + 6단계 스테퍼 + 배포 Agent (`lib/hub/deploy/hub-deploy-runtime.ts`).  
**구 wizard 단계** (Package · Manifest · Permissions …)는 **고급 설정 패널**로 흡수 — 별도 Admin IA 금지.

### 3.3 Platform Graph (파일 탐색기 ≠ SSOT)

```text
OsakaStay
├── Frontend (Search · Detail · Booking)
├── Backend (services)
├── Capabilities
│   ├── hotel.search
│   ├── hotel.detail
│   ├── room.availability
│   ├── booking.prepare / booking.confirm / booking.cancel
│   └── payment.prepare / payment.commit / payment.refund
├── Data Models (Hotel · Room · Booking · Payment)
└── Workflows (Hotel Booking · Cancellation)
```

Tree = **Platform Graph 시각화**. Dev가 “환불 추가해줘” → AI가 refund capability + workflow + permission + UI + test **제안**.

### 3.4 Dev 자연어 (Rimvio Agent — Developer Context)

자연어가 **First Class**. 별도 Builder Agent가 아니라 **Rimvio Agent**가 Platform graph를 연산한다.

```text
Developer utterance
      ↓
Rimvio Agent (Developer Context)
      ↓
Build Intent → Platform Blueprint
      ↓
Developer Approval
      ↓
Code / Data / Capability / Workflow patch
      ↓
Sandbox test → Preview
      ↓
Publish → Hub
```

**“배포해”** → Deployment check → test → Hub publish (구현: `executeHubDeployTurn` · intent `deploy`).

### 3.5 Capability 화면 (1급 객체)

탭: Code · Manifest · Permissions · Tests · Usage · Versions  
단순 REST endpoint가 아님 — **Agent contract**.

### 3.6 Preview → Test → Deploy 루프

```text
Local → Preview → Sandbox → Production
```

| Gate | Checks |
|------|--------|
| Test | manifest · permission · schema · sandbox · domain scenarios |
| Deploy | build · tests · permissions · manifest · runtime · security · payment · migration |
| Hub Publish | capabilities registered · runtime ready · tests passed · version bump |

### 3.7 Versioning

```text
Capability → Version → Compatibility → Agent availability
```

Breaking change 시: “⚠ 3 Agent workflows affected” + 호환성 분석 UI.

### 3.8 Dev AI 진짜 가치

Dev: “결제 후 예약 확정이 안 돼”  
AI는 Code + Capability + Workflow + Events + Logs + Schema + Deploy를 **함께** 조사 → `payment.completed`는 있는데 `booking.confirm` transition 누락 등.

---

## 4. Hub Publish → Agent 연결 (제품 핵심 순간)

### 4.1 Ownership vs Compatibility (ADR-059)

Platform과 Capability는 **별개 객체**다. 다만 Platform 제작자는 **자기 Capability를 함께 Publish**할 수 있다.

```text
Ownership          Compatibility
A → Platform A     Cap B-1 ──approved──→ Platform A
A → Cap A-1
B → Cap B-1
```

| Creator | Publish UX |
|---------|------------|
| **A (Platform owner)** | Publish Platform — Platform ✓ + owned Capabilities ☑ + Visibility + Agent access |
| **B (Capability only)** | Publish Capability to Hub — compatible platforms list (no Platform ownership transfer) |

원칙:

1. Platform 제작자는 자기 Capability를 자유롭게 포함  
2. Capability는 Platform 없이도 단독 제작·Publish 가능  
3. 타 Creator Capability는 **호환 + Platform owner 승인** 후에만 연결  
4. Agent는 Permission + Compatibility + Version + Runtime 모두 통과 시에만 실행  

Capability 4층: **Logic · Contract · Runtime · Experience** — Hub는 검증된 블록만 Registry에 올린다.

**Certified (ADR-061):** Rimvio 계약·실행환경 통과 — **무조건 작동 보증 아님.** Capability Certified와 Platform Certified는 **별도 티어**:

```text
Capability Certified → Composition → Integration → E2E → Platform Certified
```

**Wire:** `lib/hub/dev/hub-publish-model.ts` · `compatibility-registry.ts` · `hub-dev-publish-panel.tsx`

### 4.3 Rimvio vs Creator vs Agent (경계)

```text
                 RIMVIO
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
   Create OS    Runtime      Hub
       │           │           │
       └───────────┼───────────┘
                   ↓
             Creator Platform  ← 독립 실행 단위 · Creator가 사업처럼 운영
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
     Admin      Business     Analytics

Capability Creator → Hub Registry ──compatible──→ Platform
Agent (consumer) → discovery → Prepare → User Commit
```

| 주체 | 역할 |
|------|------|
| Rimvio | 만드는 방법 + 실행 환경 + 연결망 (Create OS · Runtime · Hub) |
| Platform Creator | Platform + 사업 운영 (Admin · Business · Analytics) |
| Capability Creator | 능력 공급 (Hub / 호환 Platform) |
| Agent | **One Rimvio Agent** — User Context + Developer Context (ADR-058) |

**소유권은 분리 · 조립/배포 경험은 통합** — Platform 제작자는 자기 Capability를 한 번에 Publish 가능 (ADR-059).

### 4.2 Publish → Discovery pipeline

```text
Dev: OsakaStay v1.2 Publish
        ↓
Rimvio Hub
        ↓
Capability Registry (hotel.search@1.2 …)
        ↓
Rimvio Agent: “새 Capability 발견”
        ↓
User: “난바역 호텔 예약해줘”
        ↓
Discovery → `hotel.search` Capability → Runtime Router → Prepare → User Commit
```

**Publish 전에는 Agent가 사용할 수 없다** — Registry가 유일한 discovery SSOT.

---

## 5. One Agent, Two Experiences (비교)

| | User Experience | Developer Experience |
|---|-----------------|----------------------|
| **Agent** | Rimvio Agent (User Context) | **Same** Rimvio Agent (Developer Context) |
| 입력 | “오사카 난바역 호텔 예약해줘” | “호텔 예약 Platform 만들어줘” |
| Intent | Execute · Discovery | Build · Platform Analysis |
| 출력 | Capability 실행 · Workspace patch | Platform graph · manifest · tests |
| Hub 연결 | Published **Capability** discovery | Publish → Registry |
| Commit | User 결제/승인 (`payment.commit`) | Dev Apply / Deploy / Publish |

**UX 비유:** Cursor처럼 “말하면 된다” — **하지만 Agent는 Rimvio 하나**다.

---

## 6. UX 원칙 10 (PR gate)

1. Dev에게 파일 관리부터 시키지 않는다 — **자연어 First Class**
2. AI는 Platform **graph**를 이해한다 — 파일 하나만 고치지 않는다
3. **Capability = 1급 객체** — endpoint 래퍼 아님
4. **Platform = Dev 단위** — Agent 노출 단위는 **Published Capability** (ADR-059 · ADR-063)
5. **Hub = 4 Stores + Compatibility** — Capability Registry는 Agent discovery SSOT; Infra/Runtime/Adapter는 binding·검증
6. **Registry = Published Capability 목록** (Platform 이름 아님)
7. Runtime · Permission — Dev 제어; Router가 Hub Registry에서 선택
8. **Preview → Test → Deploy** 단일 루프
9. Side effect — **`payment.prepare` / `payment.commit` / `payment.refund`** — Prepare/Commit 분리
10. User에게 인프라 숨김 · Dev에게 Compatibility Graph + 전체 제어권

---

## 7. 구현 상태 (2026-03 — living)

| Area | Status | Path / note |
|------|--------|-------------|
| Hub Dev Workspace (3-col) | 🟡 MVP shipped | `/hub/submit/capability` · `/hub/submit/platform` |
| Deploy Agent Plan→Publish | 🟡 MVP | `hub-deploy-runtime.ts` |
| Platform SDK + manifest | 🟢 | ADR-054 |
| Builder RIR | 🟢 | `/hub/build` ADR-055 |
| Capability index + discovery | 🟡 | `discover-capabilities.ts` — wire to Agent home |
| NL Intent compiler | 🟡 | `compile-nl-intent.ts` |
| Platform host / preview | 🟡 | `/platform/[platformId]` |
| OsakaStay reference platform | 🔴 | seed manifest + demo capabilities |
| User hotel booking UX (7-step) | 🔴 | lodging workspace exists — Capability-first discovery TODO |
| Workflow engine UI | 🔴 | draft fields only |
| Observability / usage dashboards | 🔴 | inspector mock |
| Agent simulation in Hub | 🔴 | spec §14 |
| Secrets manager | 🔴 | env / future |
| Full commerce prepare/commit UI | 🟡 | Field FSM · protocol types |

---

## 8. 관련 문서

| Doc | Role |
|-----|------|
| [RIMVIO_PRODUCT_DEFINITION.md](./RIMVIO_PRODUCT_DEFINITION.md) | Product SSOT · five lines |
| [RIMVIO_PLATFORM_SDK_SPEC.md](./RIMVIO_PLATFORM_SDK_SPEC.md) | Dev Platform OS contract |
| [RIMVIO_BUILDER_SPEC.md](./RIMVIO_BUILDER_SPEC.md) | RIR · vibe loop |
| [RIMVIO_UX_CONSTITUTION.md](./RIMVIO_UX_CONSTITUTION.md) | Globe vs Field |
| [RIMVIO_AGENT_OPERATING_CONSTITUTION.md](./RIMVIO_AGENT_OPERATING_CONSTITUTION.md) | Prepare · Commit · Workspace law |
| ADR-045 | One Agent Runtime |
| ADR-054–057 | SDK · Builder · Markets · OS Constitution |
| ADR-058 | This dual-experience decision |

---

## 9. Cursor 구현 체크리스트 (새 기능 시)

- [ ] Consumer path: utterance → intent → **capability discovery** → prepare → commit (not direct vendor API)
- [ ] Producer path: NL → plan → patch → test → publish → **registry**
- [ ] No parallel discovery store beside capability-index + workspace
- [ ] User copy: L1 story layer — no “Capability”“Manifest” in hero UI
- [ ] Dev copy: graph impact + Apply gate before mutate
- [ ] Unit Canon on money/time in hotel cards
- [ ] Version field on published capabilities
