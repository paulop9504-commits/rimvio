# ADR-061: Certification tiers & Rimvio vs Creator boundary

**Status:** Accepted  
**Date:** 2026-08-28  
**Parent:** ADR-059 · ADR-060 · [RIMVIO_PRODUCT_DEFINITION.md](../RIMVIO_PRODUCT_DEFINITION.md)

## Context

Rimvio must explain **Certified** without over-promising, and separate **Capability-level** checks from **Platform-level** checks. Creators operate Platforms as independent business units; Rimvio provides Create OS · Runtime · Hub — not the hotel/booking business.

## Product definition (external)

**Metaphor (marketing):** execution-ready software Lego — verified blocks Creators assemble.

**Product label (precise):** **AI-native Platform Creation & Execution OS**

**One sentence (KO):**

> Rimvio는 일반인/Creator가 AI와 자연어로 실행 가능한 Platform을 만들고, 검증된 Capability를 조합하고, 직접 운영·발전시키며, Hub에 배포하면 Rimvio Agent가 그 Platform의 공개된 능력을 발견하고 사용자 요청을 실제 작업으로 실행할 수 있게 해주는 Experience OS다.

## Platform = Creator’s independent execution unit

A Platform is **not** an abstract “whole service” label. It is the **unit a Creator/Team owns and evolves as a business**:

```text
Creator A
   ↓
Hotel Booking Platform
   ├─ Search · Availability · Booking · Payment · Cancellation
   ├─ Admin · Analytics
   └─ (grows over time via AI + new Capabilities)
```

Search through Analytics are **parts of A’s Platform**, operated in A’s Admin — not Rimvio Hub.

## Capability: attached or standalone; ownership ≠ deploy UX

| Object | Ownership | Publish |
|--------|-------------|---------|
| Platform A | Creator A | Platform + own Capabilities **together** |
| Capability B-1 | Creator B | Standalone to Hub; **compatible** with A (not owned by A) |

**Principle:** separate ownership and lifecycle; **unified assembly and deploy experience** for the Platform author.

## Certification — what it means (and does not)

**Certified ≠ “guaranteed to work in every composition.”**

**Certified =** passed Rimvio-defined **contract + execution environment** gates at the stated tier.

### Capability Certified

```text
Submit → Schema → Runtime → Permission → Dependency
      → Sandbox → I/O test → Workflow test → UI render → Agent invoke test
      → ✓ Capability Certified
```

Layers: **Logic · Contract · Runtime · Experience** (four layers per Capability).

### Platform Certified (separate tier)

```text
Capability Certified (selected caps)
        ↓
Composition check
        ↓
Integration test
        ↓
Agent simulation
        ↓
End-to-end test
        ↓
✓ Platform Certified
```

Platform Certified does **not** replace per-Capability certification; it validates **this assembly** on **this Platform**.

## Boundary

```text
                 RIMVIO
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
   Create OS    Runtime      Hub
       │           │           │
       └───────────┼───────────┘
                   ↓
             Creator Platform
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
     Admin      Business     Analytics
                   │
                   ↓
             Creator operates
```

| Role | Responsibility |
|------|----------------|
| **Rimvio** | How to build · execution environment · Registry · Agent interface |
| **Platform Creator** | Platform + business operations |
| **Capability Creator** | Supplies capabilities to Hub / compatible Platforms |
| **Hub** | Capability Registry · marketplace discovery |
| **Agent** | User intent → capability match → execute (Prepare → Commit) |

## Wire

| Concern | SSOT |
|---------|------|
| Capability certification view | `lib/hub/dev/hub-publish-model.ts` |
| Platform certification view | same |
| Ownership / joint publish | ADR-059 |
| Creator operations vs OS | ADR-060 |

## PR reject

- UI copy implying Certified = 100% production success in all combinations  
- Skipping Platform tier when publishing multi-capability Platforms  
- Rimvio operating Creator business data (hotels, prices, settlements) as default  
- Merging Platform and Capability into one object or one owner field
