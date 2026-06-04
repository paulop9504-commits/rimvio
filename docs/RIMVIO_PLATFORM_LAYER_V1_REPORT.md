# Rimvio Platform Layer v1

## Mission

Productize the behavioral OS as an **extensible platform** with a stable external API, validated plugins, and versioned runtime — without exposing core engines.

## Architecture

```
Runtime Core (bootstrap order)
    ↓
Platform API (`platform-api.ts`)
    ↓
Extension Registry + Plugin Validator
    ↓
Plugins (surface / capability / signal / loop / adapter)
    ↓
Engine Bridge (internal only)
    ↓
Core Engines + Stability Layer
    ↓
UI
```

## Public entry

External code imports **`@/lib/platform/rimvio-platform`** only.

## Bootstrap order

1. Stability Layer  
2. Surface Engine  
3. Loop Engine  
4. Capability Registry  
5. Learning Layer  
6. Realtime Engine  
7. Extension Registry  

## Platform API

| API | Purpose |
|-----|---------|
| `subscribeSurface()` | Surface frame events |
| `streamSurfaces()` | Deterministic surface stream |
| `dispatchCapability()` | Core + `PLUGIN:*` capabilities |
| `observeLoopState()` | Active loop stream |
| `getActiveContext()` | Dominant loop + surface summary |
| `emitPluginSignal()` | Sandboxed signal ingress |

## Plugin rules

- Validated manifest + permissions by type  
- Forbidden: `event_store_write`, `bypass_stability`, `direct_execution_enqueue`, …  
- Capabilities map to core `dispatchCapability` (never bypass registry)  
- Runtime v1 plugins run on v2 host (backward compatible)  

## Tests

```bash
npm run test:platform
```
