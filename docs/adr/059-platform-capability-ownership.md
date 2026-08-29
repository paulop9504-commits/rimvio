# ADR-059: Platform vs Capability — Ownership, Compatibility, Joint Publish

**Status:** Accepted  
**Date:** 2026-08-28  
**Parent:** ADR-058 · [RIMVIO_DUAL_EXPERIENCE.md](../RIMVIO_DUAL_EXPERIENCE.md)

## Context

Hub Dev Workspace lets Creators build Platforms and Capabilities. Two tensions must coexist:

1. **Platform authors** should ship fast — create Platform + owned Capabilities and **publish together**.
2. **Ecosystem** — third-party Creators attach Capabilities to existing Platforms via **compatibility**, without transferring ownership.

Platform and Capability must **not** be treated as the same object.

## Decision

### Separate objects, joint publish allowed

```text
A Creator
   │
   ├── Platform A
   │      ├── Capability A-1  (owner: A)
   │      └── Capability A-2  (owner: A)
   │
   └── Publish → Platform A + selected A-1, A-2

B Creator
   └── Capability B-1 (owner: B) ──compatible──→ Platform A (owner: A)
```

### Ownership vs compatibility

| Axis | Rule |
|------|------|
| **Ownership** | Platform owner ≠ Capability owner unless same Creator |
| **Bundled publish** | Platform author may include **own** Capabilities in one Publish action |
| **Standalone publish** | Capability author may Publish to Hub without owning a Platform |
| **Third-party attach** | Requires Platform owner **approval** (`CompatibilityGrant`) |
| **Agent invoke** | Permission + Compatibility + Version + Runtime must all pass |

### Capability four layers (Hub certification)

Each Capability in Registry carries:

1. **Logic** — what it does  
2. **Contract** — input / output schema  
3. **Runtime** — where / how it executes  
4. **Experience** — UI contract for end users  

Platform Publish runs an additional gate: Composition → Integration → Agent simulation → E2E → **Platform Certified**.

**Certified semantics (ADR-061):** Certified = passed Rimvio contract/runtime gates at that tier — **not** a guarantee every future composition works. Capability Certified and Platform Certified are **separate** tiers.

### Platform = Creator execution unit

A Platform is the **independent unit** a Creator/Team owns and evolves (e.g. Hotel Booking = Search + Booking + Payment + Admin + Analytics — all **A’s** Platform, operated by A).

**Deploy UX:** ownership is separate; **assembly + Publish experience is unified** — Platform author may Publish Platform + owned Capabilities in one action.

| Concern | SSOT |
|---------|------|
| Publish options + certification views | `lib/hub/dev/hub-publish-model.ts` |
| Third-party compatibility grants | `lib/hub/dev/compatibility-registry.ts` |
| Registry metadata | `lib/platform-sdk/capability-index.ts` (`ownerCreatorId`, `origin`, `rimvioCertified`) |
| Platform publish UI | `components/hub/dev/hub-dev-publish-panel.tsx` |
| Standalone capability publish UI | `components/hub/dev/hub-dev-standalone-capability-publish.tsx` |

## Consequences

- **Do:** Filter manifest capabilities on publish; store owner per index entry.  
- **Do:** Show bundled + approved third-party caps separately in Publish UI.  
- **Don't:** Block joint Platform + owned Capability publish.  
- **Don't:** Merge Platform and Capability into one lifecycle object.  
- **Don't:** Allow unapproved third-party Capability attachment.

## PR reject

- Treating `platformId` as `capabilityOwnerId`  
- Publishing third-party Capability without `CompatibilityGrant`  
- Agent discovery bypassing Registry or compatibility checks
