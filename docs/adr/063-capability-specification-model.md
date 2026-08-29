# ADR-063: Capability Specification Model — Six Pillars + Implementation Split

**Status:** Accepted  
**Date:** 2026-08-29  
**Parent:** ADR-062 · ADR-058 · [RIMVIO_CORE_OS.md](../RIMVIO_CORE_OS.md)

## One sentence

> **Rimvio Capability is not "code an AI can call" — it is a reusable, standardized unit of executable behavior for achieving a goal.**

Same interface → interchangeable implementations (Google Hotels API · Booking API · Browser Agent).

## Decision

### Capability ≠ Code

```text
Capability
   │
   ├── Specification (contract — Rimvio validates)
   │      ├─ ① Intent
   │      ├─ ② Input
   │      ├─ ③ Action
   │      ├─ ④ Requirements (Runtime · Infrastructure)
   │      ├─ ⑤ Permission
   │      ├─ ⑥ Output
   │      └─ Success / Failure Conditions
   │
   └── Implementation (Dev-owned)
          └─ Code · Agent · API adapter · Browser automation
```

### Six pillars

| # | Pillar | Question |
|---|--------|----------|
| ① | **Intent** | What problem does it solve? |
| ② | **Input** | What must the caller provide? |
| ③ | **Action** | What does execution do? |
| ④ | **Requirements** | Which Runtime / Infrastructure? |
| ⑤ | **Permission** | What may it access? |
| ⑥ | **Output** | What is returned? |

Plus **Success / Failure conditions** for Verification (ADR-045 spine).

### Three-way split (Rimvio architecture)

| Layer | Role |
|-------|------|
| **Capability** | *What* to do (Specification) |
| **Runtime** | *How* to execute (Router selects from Hub Registry) |
| **Infrastructure** | *Where* to execute (PLC · supplier API · cloud region) |

```text
User utterance
     ↓
Discovery → Capability (Specification)
     ↓
Requirements check
     ↓
Runtime Router (Hub Registry)
     ↓
Infrastructure (via Adapter)
     ↓
Execution → Output objects
```

### Wire

- Types: `lib/rimvio-protocol/capability-specification.ts`
- Compiler: `compileCapabilityPackage()` · `compileCapabilitySpecificationFromId()`
- Runtime requirements: `lib/platform-sdk/runtime-requirements.ts` (reads spec)
- Router: `lib/rimvio-core/runtime-router-select.ts`

### PR reject

- Capability = raw function name only, no Input/Output/Permission contract
- Implementation details in Discovery SSOT (provider URLs in index)
- Runtime bypass — Capability calling OS / network directly
- Mixing Specification and Implementation in one unpublished blob without version
