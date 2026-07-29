# Field dashboard ingress

> **Status:** 2026-07 — Field = **execution / monitor** ingress (sheet + bottom nav).  
> **Architecture:** [ADR-027](./adr/027-one-globe-reality-context-layers.md) — One Globe; Field is not a second earth.  
> **Role separation:** `docs/GLOBE_FIELD_ROLE_SEPARATION.md`

## Purpose

Field dashboard = **실행·모니터 표면** — **결재함**, **진행 중 거래**, **내가 공개한 맥락** 관리.

이웃 listing browse는 Globe discovery lens / 관련 표면에서; Field는 실행·승인·거래 FSM.  
개인 맛집·숙소 recall은 Field에 넣지 않음 (Globe + Workspace). GPS 맛집/숙소 카탈로그 Floor 금지.

## SSOT

| Layer | Module |
|-------|--------|
| Types | `lib/nav/field-dashboard-types.ts` |
| Open API | `lib/nav/field-dashboard-ingress.ts` |
| Events | `lib/nav/field-sheet-bridge.ts` (`FieldSheetOpenRequest` = `FieldDashboardIngress`) |
| UI | `OpportunityDashboardSheet` → `OpportunityDashboardBody` |

**Rule:** Pills, bottom nav, hub handoffs, and deep links must call `openFieldDashboardIngress` — no second list store. Legacy `GlobeMarketManageSheet` → **내 글** (`mine`) 탭.

## Tabs

| Tab | `fieldTab` | Role |
|-----|------------|------|
| 결재함 | `queue` | Reality prep / CEO Sign (default bottom-nav) |
| 진행 중 | `trades` | 핸드셰이크·일정 중인 거래 |
| 내 글 | `mine` | 내 seeking/listing · 지도 fly-to |

## Ingress shape

```ts
type FieldDashboardIngress = {
  primaryEventId?: string | null;
  tab?: "queue" | "trades" | "mine";
  highlightTradeId?: string | null;
};
```

## Bottom nav (primary ingress)

「맞춤」 tab → `openFieldDashboardFromBottomNav()`:

- Gate 없음 — sheet 항상 열림
- 기본 탭: **결재함** (`queue`)
- Second tap closes sheet
- Badge = queue count (`useFieldNavBadge` / `resolveFieldNavBadgeCount`)

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
openFieldDiscoveryIngress(activeEventId); // → queue (browse demoted)
openFieldMineIngress();
```

## Deep link (globe home)

```
/?openField=1&fieldTab=trades&highlightTrade=<handshakeId>&fieldEvent=<eventId>
```

Parsed by `parseFieldDashboardIngressFromSearchParams` in `globe-home-client`.

## PR reject

- Parallel Field dashboard route with its own fetch loop
- Pill-local state that does not open `OpportunityDashboardSheet`
- GPS 맛집/숙소 in Field discovery floor
- Separate `GlobeMarketManageSheet` for external manage
- Framing Field as 「밖 지구 / 외부 지구」 in new L1 copy (use 맞춤 · 결재함 · 찾기)
- Framing PromptFrame compose as map **search box** — use Context Command Bar (ADR-028)
