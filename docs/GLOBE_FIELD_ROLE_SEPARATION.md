# Globe AI ↔ Field Dashboard — role separation

> **Ingress SSOT:** `docs/FIELD_DASHBOARD_INGRESS.md`  
> **Architecture:** [ADR-027](./adr/027-one-globe-reality-context-layers.md) — One Globe  
> **Status:** 2026-07 — Field = execution/monitor; not a second planet

## One-line test

**"이 질문/기능이 Compose(맥락 만들기)인가, 실행·모니터(거래·찾기·결재)인가?"**

**Product law:** Users **create context** only; AI **executes** the Task Graph and **projects** onto **one** Reality Surface — never duplicate truth on the map or Field. See [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) § North Star · ADR-027.

| | Globe (Compose · Reality Surface) | Field (Execution · Monitor) |
|--|-----------------------------------|-------------------------------|
| 인칭 | 1인칭 Intent → Context · Workspace | 이웃 자원 · 진행 거래 · 결재 |
| 입력 | 자연어 ask / Compose | 탐색·탭·폼·Sign |
| 결과 | Context · Workspace · Focus | 발견 / 협상 / 승인 |
| AI chat | orchestrator (action-chat) · Workspace AI | 없음 — peer chat redirect만 |

## Globe → Field (single channel)

```ts
import { openFieldDashboardIngress } from "@/lib/nav/field-dashboard-ingress";

openFieldDashboardIngress({ tab: "queue" });
openFieldDashboardIngress({ tab: "trades", highlightTradeId });
openFieldDashboardIngress({ tab: "mine" });
```

**Globe must not:** `useFieldSheet`, `dispatchOpenFieldSheet`, full `MarketAlignmentSurface` handshake, `runGlobeAskExternalAction` trade CTAs.

## Field → Globe (intentional bridges)

| Bridge | Module |
|--------|--------|
| Map fly-to | `subscribeFieldFlyToIntent` |
| Peer chat | `openMarketChatForListing` (→ shared bridge, future) |
| Trade complete writeback | `commitMarketCompletionTrace` → personal pin |

## PR reject (Globe)

- Trade accept / handshake progress on map composer
- External discovery ask with chat/trade/join CTAs (use Field ingress)
- Full listing wizard on Globe (trigger → `openFieldDashboardIngress({ tab: "mine" })`)
- Dual-planet chrome / 「내 지구 · 밖 지구」 toggle UI (ADR-027)

## PR reject (Field)

- Multi-turn action-chat orchestrator
- Personal GPS 맛집/숙소 in discovery floor — **see FIELD_DASHBOARD_INGRESS.md**

## Product lock — A first (personal 맛집/숙소 → Globe)

**Decision (2026-06, restated 2026-07):** 개인 맛집·숙소는 **Globe + Context Workspace**만. Field discovery floor에 GPS POI(맛집/숙소 카탈로그)는 **하지 않음**.

| Surface | Personal 맛집/숙소 | Neighbor listings / trades |
|---------|-------------------|----------------------------|
| **Globe** | ✅ composer · Workspace · ExperienceRun | discovery lens / ingress CTA |
| **Field** | ❌ PR reject | ✅ trades · mine · queue |

**SSOT chain:** natural language → `EventCandidate` (plan context) → Hub inventory on event → map markers (lodging/eatery) — never Field POI for personal recall.

**Finance (separate axis):** personal CFO / capital → [RIMVIO_CAPITAL_OS.md](./RIMVIO_CAPITAL_OS.md). **Macro Graph** ≠ Field Market (listings).

## Implementation phases

| Phase | Work | Status |
|-------|------|--------|
| 1 | A+B — trade summary + discovery ingress on Globe | **shipped** |
| 1b | **ExperienceRun** — CaptureSheet agent (출장→event→lodging→summary) | **shipped** |
| **A** | Personal 맛집/숙소 on Globe — composer supply + ExperienceRun eatery | **shipped** |
| **027** | One Globe nouns — docs + L1 (내 맥락 / 발견) | **in progress** |
| 2 | G — MEANING structured fields in Phase 2/3 | planned |
| 3 | F — place-search pin chain | planned |
| 4 | C+D+E — listing Field-only, bridges, dead code | planned |
| 5 | ESLint scope expansion | **partial** |
