# Rimvio Dual Experience — User Agent × Dev Creator

**Status:** CANON (product UX + architecture SSOT for “two Cursors”)  
**Audience:** PM · design · engineering · every Cursor agent  
**Parent:** [RIMVIO_PRODUCT_DEFINITION.md](./RIMVIO_PRODUCT_DEFINITION.md) · [RIMVIO_OS_CONSTITUTION.md](./RIMVIO_OS_CONSTITUTION.md)  
**Wire:** `lib/rimvio-protocol/` · `lib/platform-sdk/` · `lib/platform-builder/` · `lib/hub/deploy/` · `lib/context-run/` · `lib/workstream/`  
**ADR:** [058-dual-experience-hub-dev-workspace.md](./adr/058-dual-experience-hub-dev-workspace.md)

> **한 줄:** Rimvio는 **두 개의 Cursor**다 — 사용자는 Globe에서 *무엇을 하고 싶은지* 말하고, Dev는 Hub Dev Workspace에서 *Agent가 쓸 Platform·Capability*를 만든다. 둘은 **Hub → Capability Registry**에서 연결된다.

---

## 0. 전체 제품 구조

```text
                         RIMVIO
                           │
          ┌────────────────┴────────────────┐
          │                                 │
       USER / AGENT                     DEV / CREATOR
          │                                 │
       Globe / Workspace                Dev Workspace
          │                                 │
          │                         Platform 개발
          │                                 │
          │                         Capability 개발
          │                                 │
          │                         Test / Deploy
          │                                 │
          │                              Hub Publish
          │                                 │
          │                                 ▼
          │                         ┌──────────────┐
          │                         │  Rimvio Hub  │
          │                         └──────┬───────┘
          │                                │
          │                         Capability Registry
          │                                │
          └────────────────────────────────┘
                           │
                           ▼
                     Rimvio Agent
                           │
                    Intent → Discovery
                           │
                    Capability 선택
                           │
                         Execute
                           │
                       Result / Commit
```

| 경험 | 표면 | 사용자 질문 | 금지 |
|------|------|-------------|------|
| **Consumer** | Globe · Workspace · Field | “뭘 하고 싶다” | Intent/Capability/Platform 내부 용어를 기본 UI에 노출 |
| **Producer** | Hub Dev Workspace · Builder | “Agent가 할 수 있는 능력을 만든다” | 파일 트리·폼 위저드만 있는 Admin Dashboard |

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
│  AI Builder · Editor · Preview · Graph  │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│            RIMVIO PLATFORM OS           │
│  SDK · Runtime · Context · Permission   │
│  Auth · Data · Secrets · Sandbox        │
│  Test · Deploy · Logs · Commerce        │
└──────────────────┬──────────────────────┘
                   ▼
              Rimvio Hub → Registry → Agent
```

| Rimvio 제공 (인프라) | Dev가 하는 일 | 코드 SSOT (현재) |
|---------------------|---------------|------------------|
| AI Dev Workspace | 자연어로 개발 지시 | `components/hub/deploy/` · `lib/hub/deploy/hub-deploy-runtime.ts` |
| Rimvio SDK / Manifest | Capability·Platform 정의 | `lib/platform-sdk/` · ADR-054 |
| Capability Runtime | 비즈니스 로직 실행 | `lib/platform-sdk/platform-host.ts` |
| Capability Registry | Agent discovery | `lib/platform-sdk/capability-index.ts` · `discover-capabilities.ts` |
| Permission system | 권한 선언 | `lib/platform-sdk/permissions.ts` · ADR-047 |
| Context system | contextRequirements 선언 | `lib/rimvio-protocol/context.ts` |
| Builder / RIR | NL → Blueprint → manifest | `lib/platform-builder/` · ADR-055 |
| Market deployment | KR/JP/US… | `lib/platform-sdk/markets.ts` · ADR-056 |
| Sandbox test (MVP) | 실행 전 검증 | Hub wizard `runSandboxTest` · deploy runtime |
| Commerce / Prepare→Commit | 결제·예약 경계 | `lib/rimvio-protocol/commerce.ts` · Article 0 |
| Workflow engine | 🟡 설계·부분 | manifest `workflows` · platform draft |
| Secrets / Observability / Agent sim | 🟢 로드맵 | — |

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
Capability Discovery     ← capability-index · NOT platform home URL
      ↓
Provider / Platform / Runtime
      ↓
Execute (Prepare only)
      ↓
Human Commit
      ↓
Workspace / Event ledger (채팅 essay SSOT 금지)
```

### 2.3 Capability Discovery 메커니즘 (핵심)

Agent는 **Platform을 검색하지 않는다.**

```text
Agent → Capability Registry → capability metadata → providerId / platformId → Runtime
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
| 2 | “서비스 준비 중” | Registry에서 `hotel.search` … `payment.process` discovery | No |
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

> Rimvio Hub는 Capability 등록 폼이 아니다. Dev가 **Platform 전체**(코드·UI·Data·Workflow·Capability·Permission·Runtime·Payment)를 **AI-native Dev Workspace**에서 만들고 운영하는 곳이다. Publish하면 Capability가 Registry에 올라가 **Rimvio Agent의 능력**이 된다.

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
│   ├── booking.create / cancel
│   └── payment.process
├── Data Models (Hotel · Room · Booking · Payment)
└── Workflows (Hotel Booking · Cancellation)
```

Tree = **Platform Graph 시각화**. Dev가 “환불 추가해줘” → AI가 refund capability + workflow + permission + UI + test **제안**.

### 3.4 AI Chat 동작 (Dev Cursor)

자연어가 **First Class**. AI는 코드 생성기가 아니라 **Platform graph operator**.

```text
Dev utterance
      ↓
Impact analysis (어떤 Capability · Policy · UI 영향?)
      ↓
Plan (numbered steps)
      ↓
Preview / Diff
      ↓
[Apply]  ← Dev 승인
      ↓
Patch Workspace (manifest · code · tests)
      ↓
Sandbox test
      ↓
Preview refresh
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
Discovery → OsakaStay runtime → Search → Prepare → User Commit
```

**Publish 전에는 Agent가 사용할 수 없다** — Registry가 유일한 discovery SSOT.

---

## 5. 두 Cursor 비교

| | User Cursor | Dev Cursor |
|---|-------------|------------|
| 입력 | “오사카 난바역 호텔 예약해줘” | “호텔 예약 Platform 만들어줘” |
| 엔진 | Rimvio Agent · NL pipeline | Hub Deploy Agent · Builder RIR |
| 출력 | Experience · Workspace patch | Platform graph · manifest · runtime |
| 실행 | Capability via Registry | Sandbox → Hub Publish |
| Commit | User 결제/승인 | Dev Apply / Deploy / Publish |

---

## 6. UX 원칙 10 (PR gate)

1. Dev에게 파일 관리부터 시키지 않는다 — **자연어 First Class**
2. AI는 Platform **graph**를 이해한다 — 파일 하나만 고치지 않는다
3. **Capability = 1급 객체** — endpoint 래퍼 아님
4. **Platform = Capability 집합** + Data + Workflow + Runtime
5. **Hub = 배포 관문** — Publish 전 Agent 불가
6. **Registry = Agent 능력 목록**
7. Runtime · Permission — Dev 제어 가능, AI가 대부분 구성
8. **Preview → Test → Deploy** 단일 루프
9. Side effect — **Prepare / Commit 분리** (예약·결제)
10. User에게 인프라 숨김 · Dev에게 전체 제어권

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
