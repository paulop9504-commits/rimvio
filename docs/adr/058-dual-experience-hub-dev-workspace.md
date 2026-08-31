# ADR-058: Dual Experience — One Agent, Two Experiences

**Status:** Accepted (amended 2026-08-29)  
**Date:** 2026-03-28  
**Supersedes:** —  
**Canonical:** [RIMVIO_DUAL_EXPERIENCE.md](../RIMVIO_DUAL_EXPERIENCE.md)

## Context

Rimvio has two **experiences** on one protocol — not two agents:

1. **User Experience** — Globe / Agent — Intent → **Capability** discovery → Execute → Commit  
2. **Developer Experience** — Hub Dev Workspace — Intent → Platform development → Test → Publish → Hub

Treating Hub as a “capability registration form,” spinning up a separate “AI Builder Agent,” or having Agent discover **Platforms** breaks the closed loop.

## Decision

1. **One Rimvio Agent, Two Experiences** — User Context (Execute) and Developer Context (Build). UI may say **AI Build**; implementation is **Rimvio Agent — Developer Build Mode**. **No** parallel User Agent / Dev Agent.

2. **Agent discovers Published Capabilities, not Platforms** — Discovery SSOT: `lib/platform-sdk/capability-index.ts`. `platformId` is metadata on the capability record. Example: `hotel.search`, not “OsakaStay home.”

3. **Hub = four stores + Compatibility Graph** — Infrastructure · Capability · Runtime · Adapter ([ADR-064](./064-hub-compatibility-validation-graph.md)). Only **Published Capabilities** are directly exposed to Agent discovery.

4. **Execution path** — Discovery → Published Capability → Execution Binding → Runtime / Adapter / Infrastructure → Execute → Prepare / Commit.

5. **Dev Workspace is AI-native** — Primary surface: `components/hub/deploy/` + `components/hub/dev/`. Legacy wizard steps = advanced panels.

6. **Rimvio provides Platform OS** — SDK, runtime router, permissions, context, markets, sandbox, manifest, prepare/commit commerce boundaries.

7. **Payment capabilities** — `payment.prepare` · `payment.commit` · `payment.refund` — not ambiguous `payment.process`.

8. **User vocabulary firewall** — Intent, Capability, Platform, Runtime, Manifest = L3 — not default Globe copy.

## Consequences

- New Agent features: capability discovery before vendor/runtime invoke; no Platform discovery API.  
- New Hub UI: extend Dev Workspace; show Compatibility Graph (cap ↔ runtime ↔ infra).  
- Do not add `lib/dev-agent-runtime` or `lib/user-agent-runtime` packages (ADR-045).  
- Reference vertical (OsakaStay): published **capabilities** (`hotel.search`, …), not Globe-only hacks.

## Implementation map

| Layer | Path |
|-------|------|
| Agent spine | `lib/workstream/rimvio-agent-spine.ts` · ADR-045 |
| Dev build mode | `lib/hub/deploy/hub-deploy-runtime.ts` · `lib/platform-builder/` |
| Registry | `lib/platform-sdk/capability-index.ts` |
| Discovery | `lib/platform-sdk/discover-capabilities.ts` |
| Runtime Router | `lib/rimvio-core/runtime-router.ts` |
| Hub stores | `lib/hub/dev/*-registry.ts` |
| Capability spec | `lib/rimvio-protocol/capability-specification.ts` · ADR-063 |
