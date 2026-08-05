# Rimvio Reality Provider Runtime

**Status:** locked 2026-08  
**ADR:** `docs/adr/051-reality-provider-runtime.md`  
**Parent:** ADR-050 Agent Runtime · ADR-022 Workspace-first  
**Wire:** `lib/reality-provider/`

> **외부 현실을 Workspace로 흡수하는 공통 Runtime.**  
> JR · 버스 · 벚꽃 · 축제는 각각 다른 Runtime이 아니라 **다른 Reality Provider**다.

## Pipeline

```text
Intent
  → Need Resolution
  → Reality Provider Resolution
  → Acquire
  → Normalize
  → Workspace Patch
  → Projection
```

### 1. Need Resolution

NL / Intent → **Need** (what to absorb), not yet “which API”.

| NeedId (v1) | Example utterance |
|-------------|-------------------|
| `rail_network` | 오사카 JR 보여줘 |
| `metro_network` | 오사카 지하철 노선 |
| `shinkansen_network` | 일본 신칸센 노선도 |
| `poi_set` | 오사카 벚꽃 명소 |
| `event_set` | 난바 오늘 불꽃축제 |
| `amenity_set` | 편의점 ATM |

Region / operator / time window attach as Need constraints.

### 2. Reality Provider Resolution

Need → ordered **Provider candidates** (first usable wins; fail-closed if none).

| ProviderId | Role |
|------------|------|
| `cached_overlay` | Checked-in GeoJSON / catalog (metro · shinkansen · …) |
| `gtfs` | GTFS / GTFS-RT feeds |
| `osm` | OpenStreetMap relations / stops |
| `vendor_api` | Partner APIs (maps, events, …) |
| `workspace_graph` | Already in current Workspace / session graph |

### 3. Acquire

Provider-specific fetch. Required provider failure → status work-log, **no silent empty success**.

### 4. Normalize

Raw → Reality Object IR:

- `line` · `station` · `route_segment`
- `poi` · `event` · `amenity`

Edges: `serves` · `near` · `on_line` (relationship over flat lists).

### 5. Workspace Patch

Only mutate Context Workspace (ADR-022). No parallel “rail result store”.

### 6. Projection

Map polylines · station chips · legend · Activity transcript — **read Patch / Workspace**.

## vs Agent Runtime (ADR-050)

| | ADR-050 | ADR-051 |
|--|---------|---------|
| Focus | Lodging-class search → Patch → Commit | External-world **absorb** when Need is network/set |
| Entry | Planner → Discovery | Need → Provider Resolution |
| Share | Workspace Patch · Projection · Article 0 | same |

Discovery (hotels) may still use tools; **rail/event absorb** must enter via this Runtime.

## Network absorb (metro · JR · shinkansen · korea)

```text
User: 오사카 JR / 지하철 / 신칸센 / 전국 노선도 …
  → Need: rail_network | metro_network | shinkansen_network
  → Provider: cached_overlay (preferred; gtfs/osm fail-closed)
  → Normalize: Line (+ Station) Objects
  → Patch absorb_network (visibilityOp · lineIds · family)
  → Materialized Projection `networkAbsorb` (Workspace Reality State SSOT)
  → Map reads absorb SSOT (session bridge hooks)
```

**Visibility SSOT:** `ContextWorkspaceState.networkAbsorb` (durable) + session bridge for Map hooks.  
Domain overlay stores are **not** Map SSOT and are **not** synced from absorb.
Map hooks: `use*AbsorbLineIds` only.

**Single ingress:** `tryApplyRealityAbsorbFromUtterance`  
Overlay `tryApply*FromUtterance` stays for unit tests of command parsers — not UI/agent/Map wire.

**JR corridors:** 순환선 · 교토선 · 고베선 · 한와선 · 야마토지 · 유메사키  
**Wire:** `lib/reality-provider/` · `lib/geo/osaka-jr|osaka-metro|japan-metro|japan-shinkansen|korea-rail/`

Frozen: Capability Generation (codegen UI/tests). Live GTFS acquire.

## Code map

| Piece | Path |
|-------|------|
| Types / Need / Provider ids | `lib/reality-provider/types.ts` |
| Need Resolution | `lib/reality-provider/resolve-need.ts` |
| Provider Resolution | `lib/reality-provider/resolve-provider.ts` |
| Acquire (cached adapters) | `lib/reality-provider/acquire-network.ts` |
| Visibility fold + Materialized state | `lib/reality-provider/network-absorb-projection.ts` |
| Session bridge (Map hooks) | `lib/reality-provider/network-absorb-projection-store.ts` |
| Project + Patch | `lib/reality-provider/project-network-absorb.ts` |
| Ingress | `lib/reality-provider/run-reality-absorb.ts` |
| Barrel | `lib/reality-provider/index.ts` |

## PR reject

See ADR-051.
