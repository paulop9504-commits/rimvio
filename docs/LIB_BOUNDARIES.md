# lib/ module boundaries

Rimvio `lib/` has **~200** top-level domains. Without import rules, every module can reach every other module.

## Layers (import direction)

```
L0 substrate   events · source-of-truth · local-links · surface-contract · copy · i18n
L1 domain      globe · feed · peer-chat · experience-bridge · vault · share
L2 intelligence action-chat · event-kernel · event-os · surface-engine · goal-engine · intent
L3 lab         testing · demo · deos (stress harness only)
```

**Allowed:** L1 → L0, L2 → L1|L0, app/components/hooks → any layer  
**Forbidden:** L0/L1 → L3, L1 → L2/orchestrator internals, L0 → L1/L2

## ESLint enforcement

`eslint.config.mjs` — `no-restricted-imports` on `lib/**` (**error** for lab imports):

| Pattern | Reason |
|---------|--------|
| `@/lib/testing/**` | Test harness not in prod lib |
| `@/lib/demo/**` | Seed/demo only |
| `@/lib/action-chat/**` in globe/feed/peer | Domain must not import orchestrator |
| `@/lib/event-os/**` in globe/feed/peer | Domain must not import event-os |

## CI gate (import graph)

```bash
npm run verify:lib-boundaries          # fail if violations > baseline or new keys
npm run verify:lib-boundaries:report   # full list
npm run verify:lib-boundaries:update   # after intentional debt paydown (review required)
```

Script: `scripts/verify-lib-boundaries.mjs` · rules: `scripts/lib-boundary-rules.mjs` · baseline: `scripts/lib-boundary-baseline.json`

Rules enforced:

| Rule | Meaning |
|------|---------|
| `no-lab-imports` | L3 `testing` / `demo` / `deos` not imported from prod lib |
| `l1-no-action-chat` | globe · feed · peer-chat · experience-bridge → no action-chat |
| `l1-no-event-os` | L1 → no event-os |
| `l1-no-surface-engine` | L1 → no surface-engine |
| `l0-no-intelligence` | L0 substrate → no L2 intelligence |
| `l0-no-domain` | L0 → no L1 product domains |

**Baseline (2026-06):** **0** grandfathered violations — CI fails on any new cross-layer import.

Cleared: all rules (`l1-no-surface-engine`, `l0-no-intelligence`, `l1-no-action-chat`, `l0-no-domain`, `no-lab-imports`).

## Public entrypoints (prefer these)

| Domain | Import from |
|--------|-------------|
| Globe (leaf modules) | `@/lib/globe/*` — not cross-domain orchestrator |
| Globe master context (L1) | `@/lib/experience-context/read-client-master-orchestrator-context` |
| Feed surface wire types | `@/lib/experience-intent/feed-surface-wire` |
| Event schema-lock (L0 SSOT) | `@/lib/events/schema-lock/*` |
| Event metadata keys (L0) | `@/lib/events/event-metadata-keys` |
| Feed capture wire (L0) | `@/lib/ontology/feed-capture-wire` |
| Experience subgraph projection (L1) | `@/lib/experience-graph/project-experience-subgraph` |
| Globe inbox notifications (L1) | `@/lib/globe/inbox/project-pending-notifications` |
| Dev fun feed fallback | `@/lib/onboarding/fun-feed-links` |
| Local links updated event | `@/lib/local-links/local-links-events` |
| OCR review orchestration (L2) | `@/lib/event-kernel/review/*` |
| Surface contract (L0) | `@/lib/surface-contract/surface-contract` |
| Surface ranking facade | `@/lib/surface-engine/surface-contract` (re-export) |
| Save trajectory (L0) | `@/lib/local-links/save-trajectory-client` |
| Link row projection (L0 bridge) | `@/lib/links/link-row-projection` |
| Share slug / link TTL | `@/lib/links/share-slug`, `@/lib/links/shared-link-expiry` |
| Rimvio action types (L2) | `@/lib/event-kernel/action-contracts/rimvio-action-type-registry` |
| Feed slot time parse | `@/lib/schedule/parse-action-target-datetime` |
| Globe place text extract | `@/lib/context-resolver/place-entity-text` |
| Location confirm wire types | `@/lib/corrections/location-wire-types` |
| Peer composer orchestrate | `@/lib/chat-room/orchestrate-composer-turn` |
| Events SSOT | `@/lib/events/event-candidate`, `@/lib/life-read-model` |
| Orchestrator | `@/lib/action-chat/orchestrator/run-orchestrator-pipeline` |

## Shrinking lib/

New code: max 1 new top-level folder per vertical slice.  
Prefer extending existing domain folder over parallel `lib/foo-v2/`.
