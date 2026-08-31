# Rimvio OS Constitution

**Status:** CANON (architecture SSOT — change only via ADR)  
**ADR:** [057-rimvio-os-constitution](./adr/057-rimvio-os-constitution.md)  
**Wire:** `lib/rimvio-protocol/` · `lib/platform-sdk/` · `lib/platform-builder/`  
**Related:** [RIMVIO_PRODUCT_DEFINITION.md](./RIMVIO_PRODUCT_DEFINITION.md) · [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) · [RIMVIO_PLATFORM_SDK_SPEC.md](./RIMVIO_PLATFORM_SDK_SPEC.md) · ADR-054 · ADR-056

> **Rimvio is not an app.** It is an OS for **Identity + Context + Object + Intent + Capability + Platform + Protocol + Runtime + Permission + Market + Commerce**.

---

## 0. One sentence

> **Intent enters through Context; Capability executes on Platform; Market and Commerce shape reality; humans Commit.**

UI (Globe · Hub · Builder · Agent) are **projections** of this stack — not parallel product truths.

---

## 1. The eleven pillars (locked at design time)

| # | Pillar | SSOT |
|---|--------|------|
| 1 | Identity | `lib/rimvio-protocol/identity.ts` |
| 2 | Context | `lib/rimvio-protocol/context.ts` |
| 3 | Object | `lib/rimvio-protocol/object-model.ts` |
| 4 | Intent | `lib/rimvio-protocol/intent.ts` |
| 5 | Capability | `lib/platform-sdk/` + `capability-contract.ts` |
| 6 | Platform | `rimvio.platform.manifest.v1` + `platform-contract.ts` |
| 7 | Protocol | `lib/rimvio-protocol/` |
| 8 | Runtime | ADR-045 · Platform SDK runtime tiers |
| 9 | Permission | ADR-047 · Platform permission catalog |
| 10 | Market | ADR-056 · `lib/platform-sdk/markets.ts` |
| 11 | Commerce | `lib/rimvio-protocol/commerce.ts` |

---

## 2. Stack diagram

```text
                         RIMVIO
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
       USER              AGENT              HUB
        │                  │                  │
        │                  │         Capability + Platform
        └──────────────────┼───────────────────────────┘
                           ↓
                     RIMVIO RUNTIME
                           ↓
                   Market / Commerce / Legal
```

---

## 3. Object model

`User` · `Organization` · `Platform` · `Capability` · `Agent` · `Product` · `Listing` · `Order` · `Payment` · `Message` · `Event` · `Task` · `File` · `Location` · `Market` · `Workflow`

Canonical edges: `owns` · `contains` · `belongs_to` · `creates` · `operates_in` · `buyer` · `seller`

Callout `RimvioObject` = UI projection — not OS ontology.

---

## 4–11. See ADR-057 and protocol types

- **Identity:** personal · platform · organization facets  
- **Platform ≠ Capability** · **Platform Core ≠ Market Deployment**  
- **Context:** never `user.country` alone  
- **Intent → Capability → Platform**  
- **RIR → manifest** single compile path  
- **Events:** `domain.entity.verb`  
- **Permission + Approval + Policy**  
- **Producer economy** on top of protocol

---

## 12. Implementation priority

### Lock now

Object model · Identity · Platform/Capability · Core/Market · Context · Intent · Contracts · Permission · Runtime · Tenancy · Events · Versioning · Protocol · RIR

### Early product

Builder · Hub submission · Sandbox · Discovery · KR market · basic commerce

### Expand later

JP/US/EU · enterprise · advanced billing · marketplace economy

---

## 13. File map

```text
docs/RIMVIO_OS_CONSTITUTION.md
lib/rimvio-protocol/
lib/platform-sdk/
lib/platform-builder/
lib/hub/capability/
```
