# Rimvio Marketplace v1

## Mission

Extend the behavioral OS **platform** into an **ecosystem economy**: published capabilities, distributable surface packs, plugin store, and usage-based monetization — without modifying core engines.

## Architecture

**Concept canon:** `docs/RIMVIO_STACK_ALIGNMENT.md`

```
Platform Layer
    ↓
Provider Network (supply-side identity)     ← docs/RIMVIO_PROVIDER_NETWORK.md
    ↓
Marketplace Layer (`lib/marketplace/`)
    ↓ (internal bridge only)
Capability Registry + Extension Registry
    ↓
Core Engines + Stability
```

## Public entry

`@/lib/marketplace/rimvio-marketplace`

## Modules

| Module | Role |
|--------|------|
| `capability-market-registry.ts` | Published capability packages, reputation, versions |
| `surface-template-store.ts` | Travel / finance / scheduling surface packs |
| `plugin-store.ts` | Discovery, compatibility, versioned listings |
| `marketplace-runtime.ts` | Install + sandboxed inject + `marketplaceDispatch` |
| `capability-monetization-layer.ts` | Per-action usage, revenue attribution |
| `provider-selection.ts` | Fair deterministic provider competition |
| `internal/marketplace-bridge.ts` | Only path to platform/core |

## Principles

1. **Capability is the dispatch contract** — NAVIGATE, BOOK_FLIGHT, etc. (runtime `@` registry)
2. **Engine is the consumer install surface** — Engine Store installs Engine SKUs; see `docs/RIMVIO_STACK_ALIGNMENT.md`
3. **Surfaces are distributable packs** — templates + context rules
4. **Providers compete** — fair selection on cost/speed/reliability
5. **Neutral core** — marketplace optional; providers replaceable
6. **Usage is value** — action execution count, not installs

## API highlights

- `installCapabilityPackage` / `installSurfacePack` / `installMarketplacePlugin`
- `marketplaceDispatch` — fair provider + monetization + core dispatch
- `discoverPlugins` / `getUsageSummary` / `getProviderRevenue`

## Tests

```bash
npm run test:marketplace
```
