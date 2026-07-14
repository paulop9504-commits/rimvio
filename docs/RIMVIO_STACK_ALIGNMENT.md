# Rimvio Stack Alignment

**Status:** concept canon · minimal-energy SSOT map  
**When concepts tangle:** read this first, then the layer doc.

---

## One sentence

> **Consumer installs Engine packages on a Project; Engines dispatch Capabilities through execution adapters; Provider Network members publish and get credit by `providerMemberId`.**

---

## Stack (top → bottom)

```text
Project (ContextBlueprint)                 Consumer scope
    ↓
Orchestrator / Operator turn               NOT an Engine SKU
    ↓
Engine Package (installed)                 Engine Store · contextInstalledEnginesV1
    ↓
Capability (@ BOOK_HOTEL)                  Dispatch contract · capability-registry
    ↓
ProviderNetworkMember (providerMemberId)   Publish · hub timeline · rollup
    ↓
Execution adapter (providerId)             Fair selection · API routing
```

---

## Three identities (do not merge)

| Term | Layer | Example | SSOT |
|------|-------|---------|------|
| **`providerMemberId`** | Provider Network | `rimvio`, `acme_hotels` | Manifest wire · `readProviderMemberId()` |
| **`publisherId`** | Legacy alias | same as member id | Deprecated — normalize only |
| **`providerId`** | Execution adapter | `rimvio_travel`, `kakao_navi` | Manifest · dispatch · adapter reputation |

---

## Engine vs Capability (do not merge)

| | Engine | Capability |
|---|--------|------------|
| **What** | L3 execution package (workflow + state + tools) | Stable `@` contract |
| **Consumer installs** | Yes — Engine Store (`engineId`) | No direct install in v0 |
| **Marketplace product** | Engine SKU manifest | Capability package (inside/adjacent) |
| **UI noun (L1)** | 프로젝트 능력 / engine chips | Hub timeline action labels |
| **Wire** | `contextInstalledEnginesV1` | `contextCapabilityInvocationsV1` |

**Marketplace v1 rule:** Capability is the **dispatch/runtime contract**; Engine is the **consumer install surface**.

---

## Registry map (read, don’t duplicate)

| Concept | SSOT | Derived index (optional) |
|---------|------|--------------------------|
| Engine runtime behavior | `lib/engine/packages/` + `engine-registry.ts` | — |
| Published Engine SKU | `lib/marketplace/engine-market-registry.ts` | — |
| Core `@` capability | `lib/capability-registry/` | — |
| Published capability package | `lib/marketplace/capability-market-registry.ts` | — |
| Provider member directory | Manifest embed | `provider-member-registry.ts` + **`provider_network_members` (Supabase)** |
| Graph node → engine | `lib/engine/execution-graph-engine-bindings.ts` | Manifest nodes should follow bindings |
| Per-Context installed engines | `contextInstalledEnginesV1` | `readContextInstalledEngineIds()` = routing truth |
| Per-Context invocations | `contextCapabilityInvocationsV1` | `rollupInvocationsByProviderMember()` |

---

## Hub timeline (three row kinds)

| `kind` | Source metadata | Label pattern |
|--------|-----------------|---------------|
| `hub` | Hub action log | 숙소 확보 |
| `engine` | `contextEngineEventsV1` | 숙소 고정 |
| `capability` | `contextCapabilityInvocationsV1` | 숙소 예약 · ACME 호텔 |

Merge: `buildContextHubTimelineRows()`.

---

## Intentionally separate (don’t “fix” by merging)

- `lib/marketplace/` ecosystem vs `lib/bridge/marketplace-bridge-schema.ts` (C2C pin market)
- `installCapabilityPackage` (global sandbox) vs `installEngineManifest` (per-Context)
- Orchestrator vs Engine SKU
- Producer / worker / organization / ai_agent taxonomy

---

## Related docs

- `docs/RIMVIO_ENGINE.md` — Engine package + Engine Store
- `docs/RIMVIO_PROVIDER_NETWORK.md` — supply-side identity
- `docs/RIMVIO_MARKETPLACE_V1_REPORT.md` — publish/dispatch economy
