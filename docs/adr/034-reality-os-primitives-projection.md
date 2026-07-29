# ADR-034: Reality OS — Primitives · Graph SSOT · Projection · Progressive

**Status:** accepted 2026-07  
**Wire:** `lib/reality-os/` · continuum · Workspace SDK Host  
**Related:** ADR-025 · ADR-026 · ADR-031 · ADR-032 · ADR-033 · Article 0 · `lib/reality-object/`

## One sentence

> **Context Type은 편의 라벨이다.**  
> SSOT는 Reality Graph(Object + edges)이고, Workspace는 Projection이며, UI는 Primitive 조합이 Progressive로 자란다.

## Stack

```
Intent
  ↓
Reality Graph seed (Context + Objects)
  ↓
Primitive composition (Spatial · Timeline · Object · Pipeline · …)
  ↓
Projection (map · pipeline · timeline · …)  ← Workspace Node
  ↓
Agent (prepare)
  ↓
Commit (human)
```

Forbidden mental model: “여행 앱 / 중고 앱을 자동 생성”.

## Layers

| Layer | Owns | Not |
|-------|------|-----|
| **Reality Graph / Objects** | Durable facts & edges (`lib/reality-object`, session graph) | UI layout |
| **Primitives** | Atomic reality facets (`spatial`, `timeline`, `pipeline`…) | Domain product nouns in L1 |
| **Composition** | Which primitives this Context needs | User-picked UI mode |
| **Projection** | How Host renders Node right now | SSOT storage |
| **Progressive** | Which slots/primitives are *revealed* | Dumping full Airbnb UI on create |
| **Context Type label** | Classifier / L2 convenience (`travel`) | Hardcoded exclusive UI engine |

## Live compositions (v1)

| Label | Primitives |
|-------|------------|
| travel | `spatial` + `timeline` + `transaction` + `recommendation` |
| used_goods | `object` + `pipeline` + `communication` + `transaction` |
| driver | `spatial` + `dashboard` + `timeline` |

ADR-033 morphology = **default projection** of that composition — not a separate OS.

## Progressive rule (ADR-025 aligned)

1. On Continuum: reveal **first Focus slot only** (+ ghost waiting for next).  
2. Completing a Focus may reveal the next primitive’s slots.  
3. Never open every slot as Primary cards on create.

## Reject in review

- Workspace / morphology as write SSOT for trip/trade facts  
- New domain = new full-screen app shell  
- User picker “지도형 / 칸반형”  
- Instant full domain UI (all days + all hotels + budget) on Intent  
- Parallel primitive system bypassing `lib/reality-os/`

## Ship notes

1. `lib/reality-os/` — primitives · compose · project · progressive store  
2. Continuum writes composition bundle on Context  
3. SDK frame / Host read projection from composition (progressive)  
4. Catalog Context Types remain labels that *will* decompose the same way  
5. Bundle persists on Event metadata (`realityOsBundleV1`) + Host primitive strip  
6. Cross-Context: Continuum → Reference chips (market↔travel) · `composeLinkedReality` · Host linked strip  
