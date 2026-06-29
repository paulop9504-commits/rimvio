# Globe AI ↔ Field Dashboard — role separation

> **Ingress SSOT:** `docs/FIELD_DASHBOARD_INGRESS.md`  
> **Status:** 2026-06 — Phase 1 wiring (trade UI + discovery browse on Globe → Field ingress)

## One-line test

**"이 질문/기능이 내 얘기인가, 남의 것·거래인가?"**

**Product law:** Users **create context** only; AI **executes** the Task Graph and **projects** to 내 지구 / 밖 지구 — never duplicate truth on the map or Field. See [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) § North Star.

| | Globe AI (내 지구) | Field Dashboard (밖 지구) |
|--|-------------------|---------------------------|
| 인칭 | 1인칭 — 나의 흔적·맥락 | 3인칭 — 이웃의 자원 |
| 입력 | 자연어 ask | 탐색·탭·폼 |
| 결과 | 회상 / 의미 / 확인 | 발견 / 협상 / 확정 |
| AI chat | orchestrator (action-chat) | 없음 — peer chat redirect만 |

## Globe → Field (single channel)

```ts
import { openFieldDashboardIngress } from "@/lib/nav/field-dashboard-ingress";

openFieldDashboardIngress({ tab: "discovery" });
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

## PR reject (Field)

- Multi-turn action-chat orchestrator
- Personal GPS 맛집/숙소 in discovery floor — **see FIELD_DASHBOARD_INGRESS.md** (product tension: neighbor resource vs personal recall; resolve before wiring `useFieldPlaceDiscovery`)

## Product lock — A first (personal 맛집/숙소 → Globe)

**Decision (2026-06):** 개인 맛집·숙소는 **Globe AI + Context Hub**만. Field discovery floor에 GPS POI(맛집/숙소 카탈로그)는 **하지 않음**.

| Surface | Personal 맛집/숙소 | Neighbor listings / trades |
|---------|-------------------|----------------------------|
| **Globe (내 지구)** | ✅ composer `runGlobeMapIntentSupply` · ➕ `ExperienceRun` | ingress CTA only |
| **Field (밖 지구)** | ❌ PR reject (`FIELD_DASHBOARD_INGRESS.md`) | ✅ discovery · trades |

**SSOT chain:** natural language → `EventCandidate` (plan context) → Hub inventory on event → map markers (lodging/eatery) — never Field POI for personal recall.

**Finance (separate axis):** personal CFO / capital → [RIMVIO_CAPITAL_OS.md](./RIMVIO_CAPITAL_OS.md). **Macro Graph** ≠ Field Market (listings).

## Implementation phases

| Phase | Work | Status |
|-------|------|--------|
| 1 | A+B — trade summary + discovery ingress on Globe | **shipped** |
| 1b | **ExperienceRun** — CaptureSheet agent (출장→event→lodging→summary) | **shipped** |
| **A** | Personal 맛집/숙소 on Globe — composer supply + ExperienceRun eatery | **shipped** (composer → `experience_run` + map supply fallback) |
| 2 | G — MEANING structured fields in Phase 2/3 | planned |
| 3 | F — place-search pin chain | planned |
| 4 | C+D+E — listing Field-only, bridges, dead code | planned |
| 5 | ESLint scope expansion | **partial** |
