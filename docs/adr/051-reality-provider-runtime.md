# ADR-051: Reality Provider Runtime

**Status:** accepted 2026-08  
**Wire:** `docs/RIMVIO_REALITY_PROVIDER_RUNTIME.md` · `lib/reality-provider/`  
**Related:** ADR-014 · ADR-022 · ADR-045 · ADR-050 · Article 0

## One sentence

> **Unknown world facts enter Workspace only through Need → Reality Provider → Acquire → Normalize → Patch → Projection — never a domain-private map overlay pipeline.**

## Context

Hardcoded overlays (Osaka Metro · Shinkansen · Korea rail) work as **Cached Overlay providers**, but JR / bus / cherry-blossom / ATM must not each invent:

```text
Domain turn → Acquire → Projection
```

That forks Runtime. Product competition is the **shared absorb loop**, not one more polyline catalog.

ADR-050 locks NL → Workspace Patch for lodging-class turns.  
This ADR locks how **missing external Reality** is resolved before Patch.

> **Do not confuse with ADR-006 Capability Graph** (travel execution abilities).  
> Here **Reality Provider** = where Reality Objects are acquired from the outside world.

## Decision

### Pipeline (ordered)

```text
Intent
  → Need Resolution
  → Reality Provider Resolution
  → Acquire
  → Normalize
  → Workspace Patch
  → Projection
```

| Stage | Owns |
|-------|------|
| **Need Resolution** | What to absorb (`rail_network` · `metro_network` · `event` · `poi_set` · …) |
| **Reality Provider Resolution** | Which provider can supply it (`cached_overlay` · `gtfs` · `osm` · `vendor_api` · …) |
| **Acquire** | Fetch raw payload (fail-closed when required provider fails) |
| **Normalize** | Line / Station / Event / POI → Reality Object IR |
| **Workspace Patch** | Mutate Workspace SSOT only (ADR-022) |
| **Projection** | Map / legend / chips — never a parallel result store |

### Vocabulary

| Term | Use |
|------|-----|
| **Need** | Intent-derived absorb target (not a UI feature name) |
| **Reality Provider** | Source of world facts for that Need |
| ~~Capability~~ (this layer) | Avoid — overloaded with ADR-006 / tool registry |

### First consumer (network absorb)

```text
「오사카 JR 보여줘」 / 「지하철 노선」 / 「신칸센」 / 「전국 노선도」
  → Need: rail_network | metro_network | shinkansen_network
  → Provider: cached_overlay (gtfs/osm fail-closed fallbacks)
  → Acquire → Normalize Line (+ Station)
  → Workspace Patch (absorb_network) + Map Projection
```

**Single ingress:** `tryApplyRealityAbsorbFromUtterance` only.  
UI / agent / lodging turns must not call `tryApply*OverlayFromUtterance`.  
**Visibility SSOT:** Workspace `networkAbsorb` (Materialized Projection).  
Map hooks: `use*AbsorbLineIds` — domain overlay stores are command-parser test helpers only (not synced, not Map SSOT).

Wire: `lib/reality-provider/` · `lib/geo/osaka-jr|osaka-metro|japan-metro|japan-shinkansen|korea-rail/`

### Relationship to overlays today

Existing GeoJSON overlays are valid as **`cached_overlay` Reality Providers**, not as product Runtime themselves. New domains must register a Provider and go through Need → Resolution → Patch.

## Consequences

- Agent Runtime (ADR-050) Discovery may **call** Reality Provider Runtime when Need is external-world absorb (not only lodging inventory).  
- One Agent Runtime package (ADR-045) — extend `lib/reality-provider/`; do not invent `*-jr-runtime`.  
- Capability Generation (codegen of types/renderers) stays **frozen** — out of MVP.

## PR reject

- JR / bus / festival **private** Acquire→Projection path bypassing Need + Provider Resolution  
- UI/agent calling domain `tryApply*OverlayFromUtterance` instead of absorb ingress  
- Treating a new hardcoded GeoJSON as “the Runtime” without Provider registration  
- Chat essay as SSOT for network results  
- Auto Reality Commit from absorb Patch  
- Renaming ADR-006 Capability Graph into this layer (keep axes separate)  
- Capability Generation / on-the-fly renderer codegen in the same PR as JR MVP
