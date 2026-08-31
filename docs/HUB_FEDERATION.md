# Remote Hub Federation

> Rimvio Autonomous Agent ↔ Capability Router ↔ Connected Partner Hubs

## Vision

Rimvio's core asset is not building every capability locally — it is **discovering, selecting, composing, executing, and failing over** across connected hubs.

```
                         RIMVIO
                    Autonomous Agent
                           │
                    Capability Router
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     RIMVIO HUB        PARTNER HUB A     PARTNER HUB B
          │                │                │
     Platforms          Platforms        Platforms
     Capabilities       Capabilities     Capabilities
          │                │                │
          └────────────────┼────────────────┘
                           │
                    Remote Execution
```

## Distinctions (do not merge)

| Layer | Path | Purpose |
|-------|------|---------|
| **Hub Dev OAuth** | `lib/integrations/hub-platform/` | Stripe · GitHub · Vercel |
| **Globe Context Hub** | `lib/globe/context-hub/` | Travel commerce pipeline |
| **Provider Network** | `lib/marketplace/` | Marketplace supply-side |
| **Remote Hub Federation** | `lib/hub/federation/` | Peer Rimvio hubs |

## P0 (implemented)

| # | Capability | Module |
|---|------------|--------|
| 1 | Hub Connection | `hub-connection-registry.ts` · `hub-connect-flow.ts` |
| 2 | Authentication | `credential-vault.ts` (credentialRef only) |
| 3 | Remote Capability Discovery | `discovery/remote-hub-scan.ts` |
| 4 | Schema Discovery | scan result `schemas[]` |
| 5 | Permission Model | `permission/delegation-policy.ts` |
| 6 | Remote Execution | `execution/remote-invoke-client.ts` |
| 7 | Health Check | `health/hub-health-probe.ts` |
| 8 | Version / Compatibility | `health/compatibility-check.ts` |

## Main Agent entry points

```typescript
import { planFederatedCapabilityDiscovery } from "@/lib/hub/federation";

const plan = planFederatedCapabilityDiscovery({
  utterance: "10만원 이하 무선 이어폰 찾아줘",
});
// → product.search @ Shopping Hub (remote)
```

```typescript
import { planCrossHubComposition } from "@/lib/hub/federation";

const trip = planCrossHubComposition("오사카 여행 전체 준비해줘");
// → hotel.search @ Hotel Hub · restaurant.search @ Restaurant Hub · …
```

## One-click Connect (Dev UI)

`components/hub/dev/hub-connected-hubs-panel.tsx`

Flow: Hub URL → Auth → Permission → Scan → Health → Connected

## Tests

```powershell
npx tsx scripts/test-hub-federation-p0.ts
```

## P1 roadmap

- AI Capability Selection (ranking weights: price · latency · health · permission · region)
- Cross-Hub Composition orchestration (distributed workflow executor)
- Automatic Failover (live — stub exists)
- Remote Change Sync (webhook → impact analysis)
- Remote Debugging (logs · request/response · RCA)
- Platform Import (external hub → Rimvio Platform draft)

## P2 roadmap

- Capability Marketplace · Provider Ranking · SLA · Multi-Hub Workflow · Agent-to-Agent
