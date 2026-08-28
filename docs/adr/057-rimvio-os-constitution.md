# ADR-057: Rimvio OS Constitution

**Status:** Accepted  
**Date:** 2026-08-28  
**Canonical:** `docs/RIMVIO_OS_CONSTITUTION.md` · `lib/rimvio-protocol/`

## Context

Rimvio is being built as **AI + Capability + Platform + Developer Ecosystem + country operations** — not a single app. Many architectural choices (object model, identity facets, core/market split, intent routing, multi-tenancy) are expensive to change later.

## Decision

Adopt **eleven constitutional pillars** as the OS foundation:

Identity · Context · Object · Intent · Capability · Platform · Protocol · Runtime · Permission · Market · Commerce

Lock **🔴 tier** items in `lib/rimvio-protocol/` types + ADRs before adding surface features.

### Key separations (non-negotiable)

1. **Platform ≠ Country** — Market Deployment entity (ADR-056)
2. **Capability ≠ Platform** — capability is invokable unit; platform is container
3. **User identity** — personal · platform · organization facets
4. **User location** — account / residence / billing / shipping / current — never one field
5. **Intent** — first-class; routes to capability index before place search when matched
6. **RIR** — single intermediate representation for Builder → same manifest as developer path

### Relationship to existing ADRs

| ADR | Role |
|-----|------|
| 045 | One Agent Runtime — no parallel runtimes |
| 047 | RTS permission — map/object ownership |
| 054 | Platform SDK manifest |
| 055 | Rimvio Builder + RIR |
| 056 | Market deployment |

## Consequences

- New features declare which pillar they extend
- `lib/rimvio-protocol/` is the type SSOT for cross-cutting entities
- `lib/callout/RimvioObject` remains a **UI projection** — not the OS object model
- Hub grows two submission tracks: Capability vs full Platform

## Reject

- Implementing UI before pillar types exist for new domains
- Collapsing identity or market into a single string field
- Forking manifest or discovery per surface
