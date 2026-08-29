# ADR-060: Creator Operations vs Rimvio OS

**Status:** Accepted  
**Date:** 2026-08-28  
**Parent:** ADR-058 · ADR-059 · [RIMVIO_DUAL_EXPERIENCE.md](../RIMVIO_DUAL_EXPERIENCE.md)

## Context

Creators build Platforms like hotel booking services. Rimvio must **not** become the business operator (Agoda / 여기어때 model). At the same time, Creators should not be left to build everything from scratch — Rimvio provides **Platform OS**; Creators run **their business** inside it.

## Decision

### Two roles

| Role | Owns | Never |
|------|------|-------|
| **Creator / Team** | Hotels, rooms, rates, inventory, bookings, refunds, promotions, suppliers, customer support, analytics for their Platform | Rimvio Hub as their admin product |
| **Rimvio** | Dev Workspace, Runtime, Auth, Permission, Deploy, Registry, Hub, Agent interface, Monitoring, connection infra (secrets, webhooks) | Hotel inventory, pricing, payment settlement as Rimvio business |

### Lego at build time, business at operate time

**Build phase:** Rimvio suggests certified Capability blocks (Search, Booking, Payment, …). Creator selects → blocks install on **their** Platform.

**Operate phase:** Creator uses **Platform Admin Console** (not Rimvio Hub) to manage day-to-day business. Metrics shown in Dev Workspace Operate section are **Creator-owned demo/production data**, labeled Demo until live.

### Payment boundary

```
User → Creator Platform → Booking → Creator's Payment Provider → Confirmed
```

Rimvio provides Capability execution + permission + state — **not** payment processing as a platform business.

### Dev Workspace loop (single environment)

```text
Build → Preview → Deploy → Admin → Operations → Analytics → Capability → Hub
```

Sidebar sections: **Build · Ship · Operate · Connect · Observe · Hub**

### Wire (MVP)

| Concern | SSOT |
|---------|------|
| Creator ops model | `lib/hub/dev/creator-ops-model.ts` |
| Admin Console UI | `components/hub/dev/hub-dev-admin-console.tsx` |
| Operations / Analytics | `hub-dev-operations-panel.tsx` · `hub-dev-analytics-panel.tsx` |
| Supplier connections | `hub-dev-integrations-panel.tsx` |
| Nav structure | `lib/hub/dev/platform-nav.ts` |

## Consequences

- **Do:** Label Operate metrics as Demo until production connected.  
- **Do:** Show Rimvio OS boundary card in Admin Console.  
- **Do:** Let Creator connect payment provider and suppliers on their Platform.  
- **Don't:** Present Rimvio as the hotel/booking merchant of record.  
- **Don't:** Merge Rimvio Hub UI with Creator Admin Console.

## PR reject

- Rimvio-processed payments for all Platforms by default  
- Live production booking/revenue numbers without data source  
- Creator business ops only in Rimvio Hub (wrong surface)  
- “Figure it out yourself” with no certified Capability blocks at build time
