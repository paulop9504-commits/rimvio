# Field dashboard ingress

> **Status:** 2026-06 — 밖 지구 통로 SSOT (sheet + bottom nav).  
> **Role separation:** `docs/GLOBE_FIELD_ROLE_SEPARATION.md`

## Purpose

Field dashboard = **외부 지구 통로** — 중고·모임 등 **이웃 자원 찾기**, **진행 중 거래**, **내가 밖에 올린 맥락** 관리.

개인 지구(흔적·맛집·숙소)와 분리. GPS 맛집/숙소는 Field에 넣지 않음.

## SSOT

| Layer | Module |
|-------|--------|
| Types | `lib/nav/field-dashboard-types.ts` |
| Open API | `lib/nav/field-dashboard-ingress.ts` |
| Events | `lib/nav/field-sheet-bridge.ts` (`FieldSheetOpenRequest` = `FieldDashboardIngress`) |
| UI | `OpportunityDashboardSheet` → `OpportunityDashboardBody` |

**Rule:** Pills, bottom nav, hub handoffs, and deep links must call `openFieldDashboardIngress` — no second list store. `GlobeMarketManageSheet`는 제거됨 → **내 밖 지구** 탭.

## Tabs

| Tab | `fieldTab` | Role |
|-----|------------|------|
| 진행 중 | `trades` | 핸드셰이크·일정 중인 거래 |
| 찾기 | `discovery` | 이웃 listing browse (`listExternalBrowseRows`) + 내 seeking pill로 맞춤 |
| 내 밖 지구 | `mine` | 내 seeking/listing · 지도 fly-to |

## Ingress shape

```ts
type FieldDashboardIngress = {
  primaryEventId?: string | null;  // scope discovery pill to a context event
  tab?: "trades" | "discovery" | "mine";
  highlightTradeId?: string | null; // MarketTradeSessionView.handshakeId
};
```

## Bottom nav (primary ingress)

「맞춤」 tab → `openFieldDashboardFromBottomNav()`:

- Gate 없음 — sheet 항상 열림 (personal-layer DiscoveryGate 제거)
- `tab` 생략 시: 진행 중 거래 → **진행 중**, else **찾기**
- Second tap closes sheet
- Badge = trades + max(matched, browse) + own published external intents (`useFieldNavBadge`)

```ts
import { openFieldDashboardFromBottomNav } from "@/lib/nav/field-dashboard-ingress";

openFieldDashboardFromBottomNav({ tab: "mine" });
```

## Presets

```ts
import {
  openFieldTradesIngress,
  openFieldDiscoveryIngress,
  openFieldMineIngress,
} from "@/lib/nav/field-dashboard-ingress";

openFieldTradesIngress(handshakeId);
openFieldDiscoveryIngress(activeEventId);
openFieldMineIngress();
```

## Deep link (globe home)

```
/?openField=1&fieldTab=discovery&highlightTrade=<handshakeId>&fieldEvent=<eventId>
```

Parsed by `parseFieldDashboardIngressFromSearchParams` in `globe-home-client`.

## Browse vs chat

- **찾기** 탭은 own `seeking` pill 없이도 이웃 listing 목록 표시
- 행 탭 → 대화/일정은 own published `seeking` 필요 (없으면 toast)

## PR reject

- Parallel Field dashboard route with its own fetch loop
- Pill-local state that does not open `OpportunityDashboardSheet`
- GPS 맛집/숙소 in Field discovery floor
- Separate `GlobeMarketManageSheet` for external manage
