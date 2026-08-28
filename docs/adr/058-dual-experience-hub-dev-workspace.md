# ADR-058: Dual Experience — User Agent × Dev Creator Workspace

**Status:** Accepted  
**Date:** 2026-03-28  
**Supersedes:** —  
**Canonical:** [RIMVIO_DUAL_EXPERIENCE.md](../RIMVIO_DUAL_EXPERIENCE.md)

## Context

Rimvio has two economies on one protocol:

1. **Consumer** — Globe / Agent — natural language → Intent → Capability discovery → Execute → Commit  
2. **Producer** — Hub Dev Workspace — natural language → Platform graph → Test → Hub Publish → Registry

Treating Hub as a “capability registration form” or Agent as “chat + direct API calls” breaks the closed loop that makes Publish meaningful.

## Decision

1. **Two Cursors, one Registry** — User and Dev both speak natural language; outcomes differ (Experience vs Platform artifact). Connection is **Hub Publish → Capability Registry → Agent discovery**.

2. **Agent discovers Capabilities, not Platforms** — Discovery SSOT is `lib/platform-sdk/capability-index.ts` (+ `discover-capabilities.ts`). Platform is metadata on the capability record (`providerId` / `platformId`).

3. **Dev Workspace is AI-native, not admin-first** — Primary surface: `components/hub/deploy/` (3-column Cursor layout). Legacy wizard steps remain as **advanced panels**, not separate product IA.

4. **Rimvio provides Platform OS infrastructure** — SDK, runtime, permissions, context, markets, sandbox, manifest, prepare/commit commerce boundaries. Dev implements business logic inside contracts — not auth/registry/protocol from scratch.

5. **Prepare / Commit for side effects** — `booking.prepare` · `payment.prepare` until human approval; Article 0 unchanged.

6. **User vocabulary firewall** — Intent, Capability, Platform, Runtime, Manifest are L3 engineering terms — not default Globe copy.

## Consequences

- New Hub UI must extend `HubDeployWorkspace`, not parallel wizards.  
- New Agent features must route through capability discovery before vendor/runtime invoke.  
- Reference vertical (e.g. OsakaStay hotel) ships as **published platform + capabilities**, not hard-coded Globe routes.  
- Observability, workflow UI, agent simulation, secrets — explicit backlog; do not fake in chat essay.

## Implementation map

| Layer | Path |
|-------|------|
| Dev deploy runtime | `lib/hub/deploy/hub-deploy-runtime.ts` |
| Dev workspace UI | `components/hub/deploy/` |
| Registry | `lib/platform-sdk/capability-index.ts` |
| Discovery | `lib/platform-sdk/discover-capabilities.ts` |
| Agent NL | `lib/context-run/compile-nl-intent.ts` · ADR-045 spine |
| Builder | `lib/platform-builder/` · `/hub/build` |
| Protocol | `lib/rimvio-protocol/` |
