# ADR-054: Rimvio Platform SDK — unified manifest, runtime, and APIs

**Status:** accepted 2026-08-28  
**Canonical:** [RIMVIO_PLATFORM_SDK_SPEC.md](../RIMVIO_PLATFORM_SDK_SPEC.md)  
**Wire:** `lib/platform-sdk/` · Hub `lib/hub/capability/`  
**Parent:** ADR-045 One Agent Runtime · ADR-051 Reality Provider · ADR-047 Unit Canon  
**Related:** ADR-032 Marketplace as Context · `lib/platform/` internal behavioral OS

## One sentence

> **Platform developers ship one `rimvio.platform.manifest.v1`; Rimvio hosts UI · Data · Context · Capability · Permission as a single tenant-isolated contract — Agent discovers Capabilities, not pages.**

## Decision

1. **One manifest** — Package, Runtime, Permissions, Context, Data, Capabilities, UI routes, Composition, Events.
2. **Three runtime tiers** — Native (L1), Sandboxed (L2), External protocol (L3).
3. **Five APIs** — Context, Data, Capability, Permission (gate), Platform SDK (UI/Auth/Commerce/Agent facades).
4. **Strict tenant isolation** — Platform A DB ≠ Platform B; cross-platform only via declared `composition.imports` + user Commit.
5. **Capability-first Agent ingress** — User intent → discovery → platform handler → Prepare → human Commit.
6. **Hub wizard** is the submission UI over this manifest — not a parallel contract.

## Relationship to `lib/platform/`

| | `lib/platform/` | Platform SDK spec |
|--|-----------------|-------------------|
| Audience | Internal behavioral OS extensions | External / Hub-published platforms |
| Manifest | `PluginManifest` | `RimvioPlatformManifest` |
| Convergence | Host runtime executes both after permission gate | Hub publish registers into capability index |

## PR reject

- Arbitrary code upload without manifest permissions
- Cross-tenant data access
- Platform UI routes as Agent discovery SSOT (capabilities only)
- Parallel manifest formats beside `rimvio.platform.manifest.v1`
- Auto Reality Commit from platform handlers
- New `*-platform-runtime` package (extend ADR-045 stages)
