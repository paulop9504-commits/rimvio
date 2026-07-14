# Rimvio Provider Network

**Status:** v0 vocabulary · wire alias  
**Related:** `docs/RIMVIO_ENGINE.md` · `docs/RIMVIO_MARKETPLACE_V1_REPORT.md` · `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md`

---

## Definition

> **Provider Network** is the supply-side layer above execution adapters. All value suppliers — producers, workers, organizations, and AI agents — share one identity model. **Consumer** installs **Engine packages** on a Project (each exposes capabilities); **Provider** publishes manifests and fulfills capabilities.

**Concept canon:** `docs/RIMVIO_STACK_ALIGNMENT.md`

```text
User
 └── Role
      ├── Consumer   → Project · Engine install · capability dispatch
      └── Provider   → manifest publish · inventory · fulfillment
            ├── producer      (goods · listings · SKUs)
            ├── worker        (labor · dispatch · completion)
            ├── organization  (hotel · airline · enterprise)
            └── ai_agent      (Engine publisher · automated supply)
```

---

## Two different "provider" terms

| Term | Layer | Example | SSOT |
|------|-------|---------|------|
| **`providerMemberId`** | Provider Network | `rimvio`, `naver-corp`, hotel chain id | `ProviderNetworkMember.memberId` |
| **`providerId`** | Execution adapter | `rimvio_travel`, `kakao_navi`, `naver_map` | Marketplace manifest · fair selection |

Do **not** collapse these. One Provider Network member may operate many execution adapters.

```text
ProviderNetworkMember (organization: "acme_hotels")
    ├── execution adapter providerId: acme_lodging_api
    └── PublishedEngineManifest: lodging_search@1.0.0
```

---

## Stack alignment

```text
Project (ContextBlueprint)              ← Consumer scope
    ↓
Orchestrator (AI)                       ← not an Engine SKU; may be ai_agent Provider
    ↓
Engine Package (installed)            ← Consumer install (Engine Store)
    ↓
Capability (@ BOOK_HOTEL)               ← stable contract
    ↓
ProviderNetworkMember                 ← publish · revenue · reputation rollup
    ↓
Execution adapter (providerId)        ← API · fair selection · monetization
```

---

## Wire (Marketplace v1)

`providerMemberId` is SSOT. `publisherId` remains as **deprecated alias** for v1 manifests.

```typescript
{
  manifestId: "eng-lodging-search-rimvio-1",
  engineId: "lodging_search",
  providerMemberId: "rimvio",      // SSOT
  publisherId: "rimvio",           // alias (legacy)
  providerId: "rimvio_travel",     // execution adapter (unchanged)
  providerKind: "ai_agent",        // optional
}
```

Helpers: `readProviderMemberId()` · `normalizePublishedEngineManifest()`  
Types: `lib/marketplace/provider-network-types.ts`

---

## Member registry (v0 local + Supabase sync)

`lib/marketplace/provider-member-registry.ts` — derived member directory indexed from manifest/capability publish.

| API | Role |
|-----|------|
| `getProviderNetworkMember(memberId)` | Resolve member + merged capability/manifest ids |
| `listProviderNetworkMembers({ kind })` | Supply-side directory |
| `registerProviderNetworkMember(member)` | Explicit join before publish |
| `mergeRemoteProviderNetworkMembers(rows)` | Hydrate from Supabase / API |
| `indexProviderMemberFromEngineManifest` | Called on engine bootstrap/publish |
| `indexProviderMemberFromCapabilityPackage` | Called on capability publish |

**Supabase (v0):** `provider_network_members` · migration `067_provider_network_members.sql`

| Path | Role |
|------|------|
| `lib/marketplace/server/sync-provider-network-member-supabase.ts` | Service-role upsert + list |
| `GET /api/marketplace/provider-members` | Authenticated read · merge into local index |
| `hydrateProviderMemberRegistryClient()` | Engine Store strip mount |

Write path: server-only after local `upsertMember` (service role). Read path: API → local merge. **Wire SSOT remains manifest embed**; DB is cross-session cache.

Seeded members: `rimvio` · `kakao-corp` · `naver-corp` · `acme_hotels`.  
Manifest embed remains wire source; registry merges on publish.

Capability invocations rollup on Context hub timeline via `contextCapabilityInvocationsV1` metadata — `recordContextCapabilityInvocation()` on `marketplaceDispatch` when `eventId` is set.

Partner example: `eng-lodging-search-acme-1` → `acme_hotels` (`organization`).

---

## Producer vs Worker (when to split)

| Shared (Provider) | Producer | Worker |
|-------------------|----------|--------|
| reputation · manifest · capability binding | catalog · SKU · listing ingest | availability · job accept · geo dispatch |
| Engine publish | inventory supply | fulfillment completion |
| Marketplace revenue attribution | unit sale | per-job payout |

Split only when settlement, approval, or discovery rules differ. Otherwise keep one `ProviderNetworkMember`.

---

## Rimvio travel MVP mapping

| Real-world | ProviderKind | Engine / capability |
|------------|--------------|---------------------|
| Hotel chain | organization | `lodging_search` · `BOOK_HOTEL` |
| OTA / Rimvio first-party | ai_agent | Engine manifests · `rimvio_travel` adapter |
| Driver / courier | worker | `transit_navigate` · `NAVIGATE` |
| Used goods seller | producer | marketplace listing capabilities (Phase 2) |

Blueprint `executionGraph` nodes → installed engines (Consumer).  
Manifest publish → Provider Network registration.

---

## Public API

`@/lib/marketplace/rimvio-marketplace`:

- `PROVIDER_KINDS` · `ProviderKind` · `ProviderNetworkMember`
- `readProviderMemberId` · `normalizePublishedEngineManifest`
- `getProviderNetworkMember` · `listProviderNetworkMembers` · `registerProviderNetworkMember`

---

## Roadmap (not v0)

- Worker dispatch graph · Producer catalog ingest
- Cross-member reputation rollup over adapters
- Consumer/Provider role switch on same user account
- Provider-owned member profile rows (beyond derived manifest index)
