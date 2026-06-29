# Field dashboard ingress

> **Status:** 2026-06 — sheet SSOT today; globe pills tomorrow.

## Purpose

Field dashboard = **진행 중 거래** + **맞는 매물** + **대화/일정 진입**.  
Globe home is recall/spatial; this surface is **transaction factory** — keep separate until pills land on the globe.

## SSOT

| Layer | Module |
|-------|--------|
| Types | `lib/nav/field-dashboard-types.ts` |
| Open API | `lib/nav/field-dashboard-ingress.ts` |
| Events | `lib/nav/field-sheet-bridge.ts` (`FieldSheetOpenRequest` = `FieldDashboardIngress`) |
| UI | `OpportunityDashboardSheet` → `OpportunityDashboardBody` |

**Rule:** Pills, bottom nav, hub handoffs, and deep links must call `openFieldDashboardIngress` — no second list store.

## Ingress shape

```ts
type FieldDashboardIngress = {
  primaryEventId?: string | null;  // scope discovery to a context event
  tab?: "trades" | "discovery";    // omit → trades if sessions exist, else discovery
  highlightTradeId?: string | null; // MarketTradeSessionView.handshakeId
};
```

## Bottom nav (primary ingress — pills later)

「맞춤」 tab → `openFieldDashboardFromBottomNav()`:

- `bypassDiscoveryGate: true` — dashboard always shows (no personal-layer gate)
- `tab` auto: **진행 중** when active trades exist, else **맞는 매물**
- Second tap closes sheet
- Badge = active trades + discovery match count (`useFieldNavBadge`)

```ts
import { openFieldDashboardFromBottomNav } from "@/lib/nav/open-field-sheet-bridge";

openFieldDashboardFromBottomNav({ tab: "trades" });
```

## Presets (globe pills — phase 2)

```ts
import {
  openFieldTradesIngress,
  openFieldDiscoveryIngress,
} from "@/lib/nav/open-field-sheet-bridge";

// Pill: "진행 중 2"
openFieldTradesIngress();

// Pill: tap one trade row
openFieldTradesIngress(handshakeId);

// Pill: "맞는 매물"
openFieldDiscoveryIngress(activeEventId);
```

## Deep link (globe home)

```
/?openField=1&fieldTab=trades&highlightTrade=<handshakeId>&fieldEvent=<eventId>
```

Parsed by `parseFieldDashboardIngressFromSearchParams` in `globe-home-client`.

## Bottom nav

「맞춤」 tab → `openFieldSheet()` with no tab (auto-pick). Same sheet SSOT.

## Phase 2 — globe pills (not shipped)

- Pill = **signal + 1-tap** only (count badge).
- Tap → same ingress presets above.
- Do **not** duplicate trade/discovery lists on the globe renderer.

## PR reject

- Parallel Field dashboard route with its own fetch loop
- Pill-local state that does not open `OpportunityDashboardSheet`
- New tab on bottom nav for trades (Field sheet is enough until pills ship)
